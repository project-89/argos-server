import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { ApiError, toUnixMillis, generateGameLink } from "../utils";
import { ERROR_MESSAGES, COLLECTIONS, ALLOWED_TAG_TYPES } from "../constants";
import {
  TagData,
  TagLeaderboardResponse,
  TagType,
  TagStats,
  FingerprintData,
  TransitoryFingerprint,
} from "../types";

const LOG_PREFIX = "[Tag Service]";
const MAX_DAILY_TAGS = 3;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Check and update daily tag limits
 */
const checkAndUpdateTagLimits = async ({
  taggerRef,
  taggerData,
  targetIsIt,
}: {
  taggerRef: FirebaseFirestore.DocumentReference;
  taggerData: FingerprintData;
  targetIsIt: boolean;
}): Promise<void> => {
  try {
    const now = Timestamp.now();
    const tagLimits = taggerData.tagLimits;

    // If no tag limits exist, this is their first time being "it"
    if (!tagLimits) {
      await taggerRef.update({
        tagLimits: {
          firstTaggedAt: now,
          remainingDailyTags: MAX_DAILY_TAGS - (targetIsIt ? 1 : 0),
          lastTagResetAt: now,
        },
      });
      return;
    }

    // Check if 24 hours have passed since last reset
    const timeSinceReset = now.toMillis() - tagLimits.lastTagResetAt.toMillis();
    const shouldReset = timeSinceReset >= MILLISECONDS_IN_DAY;

    // If target is already "it", we need to deduct a tag
    if (targetIsIt) {
      if (tagLimits.remainingDailyTags <= 0 && !shouldReset) {
        throw new ApiError(429, ERROR_MESSAGES.NO_REMAINING_TAGS);
      }
    }

    // Update tag limits
    const newTagLimits = {
      firstTaggedAt: tagLimits.firstTaggedAt,
      remainingDailyTags: shouldReset
        ? MAX_DAILY_TAGS - (targetIsIt ? 1 : 0)
        : tagLimits.remainingDailyTags - (targetIsIt ? 1 : 0),
      lastTagResetAt: shouldReset ? now : tagLimits.lastTagResetAt,
    };

    await taggerRef.update({ tagLimits: newTagLimits });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in checkAndUpdateTagLimits:`, error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Tag another user
 */
export const tagUser = async ({
  taggerFingerprintId,
  targetFingerprintId,
  tagType,
}: {
  taggerFingerprintId: string;
  targetFingerprintId: string;
  tagType: string;
}): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log(
      `${LOG_PREFIX} Attempting to tag user ${targetFingerprintId} with ${tagType} by ${taggerFingerprintId}`,
    );

    // Validate tag type
    if (!Object.values(ALLOWED_TAG_TYPES).includes(tagType as TagType)) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_TAG_TYPE);
    }

    // Validate inputs
    if (taggerFingerprintId === targetFingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_TAG_SELF);
    }

    const db = getFirestore();

    // Get tagger fingerprint to verify they exist and check if they can tag
    const taggerRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(taggerFingerprintId);
    const taggerDoc = await taggerRef.get();

    if (!taggerDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.TAGGER_NOT_FOUND);
    }

    // Check if tagger has the tag they're trying to pass
    const taggerData = taggerDoc.data() as FingerprintData;
    if (!taggerData.tags?.[tagType]) {
      throw new ApiError(403, ERROR_MESSAGES.NOT_IT);
    }

    // Get target fingerprint
    const targetRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(targetFingerprintId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const targetData = targetDoc.data() as FingerprintData;

    // Check if target already has this tag type
    if (targetData.tags?.[tagType]) {
      // Check and update tag limits before returning error
      await checkAndUpdateTagLimits({ taggerRef, taggerData, targetIsIt: true });
      throw new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED);
    }

    // Check and update tag limits
    await checkAndUpdateTagLimits({ taggerRef, taggerData, targetIsIt: false });

    // Create new tag
    const newTag: TagData = {
      type: tagType,
      taggedBy: taggerFingerprintId,
      taggedAt: Timestamp.now(),
    };

    // Update target's tags - tagger keeps their tag
    await targetRef.update({
      [`tags.${tagType}`]: newTag,
    });

    // Update tag stats with target info
    await updateTagStats({ fingerprintId: taggerFingerprintId, db, tagType });

    console.log(`${LOG_PREFIX} Successfully tagged user ${targetFingerprintId} with ${tagType}`);
    return {
      success: true,
      message: `Successfully tagged user with ${tagType}`,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in tagUser:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get remaining daily tags for a user
 */
export const getRemainingTags = async (fingerprintId: string): Promise<number> => {
  try {
    console.log(`${LOG_PREFIX} Getting remaining tags for user ${fingerprintId}`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const tagLimits = data.tagLimits;

    if (!tagLimits) {
      return 0; // User has never been "it"
    }

    // Check if 24 hours have passed since last reset
    const now = Timestamp.now();
    const timeSinceReset = toUnixMillis(now) - toUnixMillis(tagLimits.lastTagResetAt);

    if (timeSinceReset >= MILLISECONDS_IN_DAY) {
      return MAX_DAILY_TAGS;
    }

    return tagLimits.remainingDailyTags;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getRemainingTags:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Check if a user has a specific tag
 */
export const hasTag = async ({
  fingerprintId,
  tagType,
}: {
  fingerprintId: string;
  tagType: string;
}): Promise<boolean> => {
  try {
    console.log(`${LOG_PREFIX} Checking if user ${fingerprintId} has tag: ${tagType}`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    return !!data.tags?.[tagType];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in hasTag:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get tag history for a user
 */
export const getTagHistory = async (fingerprintId: string): Promise<TagData[]> => {
  try {
    console.log(`${LOG_PREFIX} Getting tag history for user ${fingerprintId}`);

    const db = getFirestore();
    const statsRef = db.collection(COLLECTIONS.TAG_STATS).doc(fingerprintId);
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      return [];
    }

    const stats = statsDoc.data() as TagStats;
    return stats.tagHistory || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getTagHistory:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Check if a user has specific tags
 */
export const getUserTags = async (
  username: string,
  platform: "x" = "x",
): Promise<{
  hasTags: boolean;
  activeTags: string[];
}> => {
  try {
    console.log(`${LOG_PREFIX} Checking tags for user ${username}`);

    const db = getFirestore();
    const transitoryRef = db.collection(COLLECTIONS.TRANSITORY_FINGERPRINTS);
    const query = transitoryRef.where("username", "==", username).where("platform", "==", platform);
    const existingDocs = await query.get();

    if (existingDocs.empty) {
      return {
        hasTags: false,
        activeTags: [],
      };
    }

    const doc = existingDocs.docs[0];
    const data = doc.data() as TransitoryFingerprint;
    const activeTags = data.tags.map((tag) => tag.type);

    return {
      hasTags: activeTags.length > 0,
      activeTags,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getUserTags:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update tag stats for a user
 */
const updateTagStats = async ({
  fingerprintId,
  db,
  tagType,
}: {
  fingerprintId: string;
  db: FirebaseFirestore.Firestore;
  tagType: string;
}): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const now = Timestamp.now();
    const statsRef = db.collection(COLLECTIONS.TAG_STATS).doc(fingerprintId);
    const statsDoc = await statsRef.get();

    // Create new tag history entry
    const newTag: TagData = {
      type: tagType,
      taggedBy: fingerprintId,
      taggedAt: now,
    };

    if (!statsDoc.exists) {
      // Create new stats document
      await statsRef.set({
        id: fingerprintId,
        fingerprintId,
        totalTagsMade: 1,
        lastTagAt: now,
        dailyTags: 1,
        weeklyTags: 1,
        monthlyTags: 1,
        streak: 1,
        tagTypes: { [tagType]: 1 },
        createdAt: now,
        updatedAt: now,
        tagHistory: [newTag],
      });
      return {
        success: true,
        message: "Tag stats created",
      };
    }

    const stats = statsDoc.data() as TagStats;
    const lastTagDate = stats.lastTagAt.toDate();
    const nowDate = now.toDate();

    // Check if this is a new day
    const isNewDay =
      lastTagDate.getDate() !== nowDate.getDate() ||
      lastTagDate.getMonth() !== nowDate.getMonth() ||
      lastTagDate.getFullYear() !== nowDate.getFullYear();

    // Check if streak continues
    const streakContinues =
      isNewDay && nowDate.getTime() - lastTagDate.getTime() <= MILLISECONDS_IN_DAY;

    // Update tag type counts
    const tagTypes = { ...stats.tagTypes };
    tagTypes[tagType] = (tagTypes[tagType] || 0) + 1;

    // Update stats
    await statsRef.update({
      totalTagsMade: stats.totalTagsMade + 1,
      lastTagAt: now,
      dailyTags: isNewDay ? 1 : stats.dailyTags + 1,
      weeklyTags: isNewDay && nowDate.getDay() < lastTagDate.getDay() ? 1 : stats.weeklyTags + 1,
      monthlyTags:
        isNewDay && nowDate.getMonth() !== lastTagDate.getMonth() ? 1 : stats.monthlyTags + 1,
      streak: streakContinues ? stats.streak + 1 : 1,
      tagTypes,
      updatedAt: now,
      tagHistory: [...(stats.tagHistory || []), newTag],
    });

    console.log(`${LOG_PREFIX} Successfully updated tag stats for user ${fingerprintId}`);
    return {
      success: true,
      message: "Tag stats updated",
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in updateTagStats:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Find or create a transitory record for a user
 */
const findOrCreateTransitoryRecord = async ({
  username,
  platform,
  discoveryInfo,
}: {
  username: string;
  platform: "x";
  discoveryInfo: {
    action: "tagging" | "being_tagged";
    relatedUsername: string;
    timestamp: Timestamp;
  };
}): Promise<TransitoryFingerprint> => {
  const db = getFirestore();
  const transitoryRef = db.collection(COLLECTIONS.TRANSITORY_FINGERPRINTS);
  const query = transitoryRef.where("username", "==", username).where("platform", "==", platform);
  const existingDocs = await query.get();

  if (!existingDocs.empty) {
    const doc = existingDocs.docs[0];
    await doc.ref.update({
      lastSeen: Timestamp.now(),
      [`discoveryHistory.${discoveryInfo.action}`]: FieldValue.arrayUnion({
        username: discoveryInfo.relatedUsername,
        timestamp: discoveryInfo.timestamp,
      }),
    });
    return { id: doc.id, ...doc.data() } as TransitoryFingerprint;
  }

  const newDoc = await transitoryRef.add({
    username,
    platform,
    createdAt: Timestamp.now(),
    lastSeen: Timestamp.now(),
    tags: [],
    tagLimits: {
      firstTaggedAt: null,
      remainingDailyTags: MAX_DAILY_TAGS,
      lastTagResetAt: Timestamp.now(),
    },
    discoveryHistory: {
      [discoveryInfo.action]: [
        {
          username: discoveryInfo.relatedUsername,
          timestamp: discoveryInfo.timestamp,
        },
      ],
    },
  });

  const newDocData = await newDoc.get();
  return { id: newDoc.id, ...newDocData.data() } as TransitoryFingerprint;
};

/**
 * Add a tag to a transitory record
 */
const addTagToTransitoryRecord = async (
  transitoryId: string,
  tag: {
    type: string;
    taggedBy: string;
    taggedAt: Timestamp;
    platform: string;
  },
) => {
  const db = getFirestore();
  const transitoryRef = db.collection(COLLECTIONS.TRANSITORY_FINGERPRINTS).doc(transitoryId);
  await transitoryRef.update({
    tags: FieldValue.arrayUnion(tag),
  });
};

/**
 * Check and update tag limits for a user
 */
const checkAndUpdateSocialTagLimits = async ({
  taggerRecord,
  targetHasTag,
}: {
  taggerRecord: TransitoryFingerprint;
  targetHasTag: boolean;
}): Promise<number> => {
  const db = getFirestore();
  const now = Timestamp.now();
  const transitoryRef = db.collection(COLLECTIONS.TRANSITORY_FINGERPRINTS).doc(taggerRecord.id);

  // Initialize tag limits if they don't exist
  if (!taggerRecord.tagLimits) {
    await transitoryRef.update({
      tagLimits: {
        firstTaggedAt: now,
        remainingDailyTags: MAX_DAILY_TAGS,
        lastTagResetAt: now,
      },
    });
    return MAX_DAILY_TAGS;
  }

  const { lastTagResetAt, remainingDailyTags } = taggerRecord.tagLimits;
  const timeSinceLastReset = now.toMillis() - lastTagResetAt.toMillis();

  // Reset daily tags if it's been more than a day
  if (timeSinceLastReset >= MILLISECONDS_IN_DAY) {
    await transitoryRef.update({
      tagLimits: {
        firstTaggedAt: taggerRecord.tagLimits.firstTaggedAt || now,
        remainingDailyTags: MAX_DAILY_TAGS,
        lastTagResetAt: now,
      },
    });
    return MAX_DAILY_TAGS;
  }

  // Only decrement remaining tags if target already has the tag
  if (targetHasTag) {
    if (remainingDailyTags <= 0) {
      throw new ApiError(403, ERROR_MESSAGES.NO_REMAINING_TAGS);
    }

    const newRemainingTags = remainingDailyTags - 1;
    await transitoryRef.update({
      "tagLimits.remainingDailyTags": newRemainingTags,
    });
    return newRemainingTags;
  }

  return remainingDailyTags;
};

/**
 * Tag a user by their social identity
 */
export const tagUserBySocialIdentity = async ({
  taggerUsername,
  targetUsername,
  platform = "x",
  tagType,
}: {
  taggerUsername: string;
  targetUsername: string;
  platform: "x";
  tagType: string;
}): Promise<{
  success: boolean;
  message: string;
  gameLink: string;
  remainingTags: number;
}> => {
  try {
    const now = Timestamp.now();

    // Create or update records for both users
    const [taggerRecord, targetRecord] = await Promise.all([
      findOrCreateTransitoryRecord({
        username: taggerUsername,
        platform,
        discoveryInfo: {
          action: "tagging",
          relatedUsername: targetUsername,
          timestamp: now,
        },
      }),
      findOrCreateTransitoryRecord({
        username: targetUsername,
        platform,
        discoveryInfo: {
          action: "being_tagged",
          relatedUsername: taggerUsername,
          timestamp: now,
        },
      }),
    ]);

    // Check if tagger has the tag they're trying to pass
    const taggerHasTag = taggerRecord.tags.some((tag) => tag.type === tagType);
    if (!taggerHasTag) {
      throw new ApiError(403, ERROR_MESSAGES.NOT_IT);
    }

    // Check if target already has this tag
    const targetHasTag = targetRecord.tags.some((tag) => tag.type === tagType);
    if (targetHasTag) {
      // Still update limits if they tried to tag someone who's already it
      await checkAndUpdateSocialTagLimits({ taggerRecord, targetHasTag: true });
      throw new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED);
    }

    // Update tag limits before adding the tag
    const remainingTags = await checkAndUpdateSocialTagLimits({
      taggerRecord,
      targetHasTag: false,
    });

    // Add the tag to target's record
    await addTagToTransitoryRecord(targetRecord.id, {
      type: tagType,
      taggedBy: taggerUsername,
      taggedAt: now,
      platform,
    });

    // Generate game link for the reply
    const gameLink = generateGameLink({
      transitoryId: targetRecord.id,
      username: targetUsername,
      platform,
    });

    return {
      success: true,
      message: `Successfully tagged ${targetUsername} with ${tagType}`,
      gameLink,
      remainingTags,
    };
  } catch (error) {
    console.error("[Tag Service] Error in tagUserBySocialIdentity:", error);
    throw error;
  }
};

/**
 * Get tag leaderboard
 */
export const getTagLeaderboard = async ({
  timeFrame = "daily",
  limit = 10,
  offset = 0,
  currentUserId,
}: {
  timeFrame: "daily" | "weekly" | "monthly" | "allTime";
  limit: number;
  offset: number;
  currentUserId?: string;
}): Promise<TagLeaderboardResponse> => {
  const db = getFirestore();
  const now = Timestamp.now();

  // Calculate the start time based on the timeframe
  let startTime: Timestamp;
  switch (timeFrame) {
    case "daily":
      startTime = Timestamp.fromMillis(now.toMillis() - MILLISECONDS_IN_DAY);
      break;
    case "weekly":
      startTime = Timestamp.fromMillis(now.toMillis() - 7 * MILLISECONDS_IN_DAY);
      break;
    case "monthly":
      startTime = Timestamp.fromMillis(now.toMillis() - 30 * MILLISECONDS_IN_DAY);
      break;
    case "allTime":
      startTime = Timestamp.fromMillis(0);
      break;
    default:
      startTime = Timestamp.fromMillis(now.toMillis() - MILLISECONDS_IN_DAY);
  }

  // Query transitory records with tags within the timeframe
  const transitoryRef = db.collection(COLLECTIONS.TRANSITORY_FINGERPRINTS);
  const snapshot = await transitoryRef
    .where("tags", "array-contains-any", [{ taggedAt: { ">=": startTime } }])
    .orderBy("tags.taggedAt", "desc")
    .get();

  // Process records to create leaderboard
  const userScores = new Map<string, { username: string; platform: string; score: number }>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const validTags = data.tags.filter(
      (tag: { taggedAt: Timestamp }) => tag.taggedAt.toMillis() >= startTime.toMillis(),
    );

    if (validTags.length > 0) {
      const key = `${data.username}-${data.platform}`;
      const existing = userScores.get(key) || {
        username: data.username,
        platform: data.platform,
        score: 0,
      };
      existing.score += validTags.length;
      userScores.set(key, existing);
    }
  });

  // Convert to array and sort
  const sortedScores = Array.from(userScores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      fingerprintId: `${entry.username}-${entry.platform}`,
      totalTags: entry.score,
      streak: 0, // TODO: Implement streak calculation for social tagging
      tagTypes: {},
      lastTagAt: now.toMillis(),
      createdAt: now.toMillis(),
      updatedAt: now.toMillis(),
    }));

  // Calculate user rank if requested
  let userRank: number | undefined;
  if (currentUserId) {
    userRank = sortedScores.findIndex((entry) => entry.fingerprintId === currentUserId) + 1;
    if (userRank === 0) userRank = undefined;
  }

  // Apply pagination
  const paginatedScores = sortedScores.slice(offset, offset + limit);

  return {
    timeFrame,
    entries: paginatedScores,
    userRank,
    generatedAt: now.toMillis(),
  };
};
