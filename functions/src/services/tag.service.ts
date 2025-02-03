import { getFirestore, Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections.constants";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";
import {
  TagData,
  TagLeaderboardEntry,
  TagLeaderboardResponse,
  TagType,
  TagStats,
  FingerprintData,
} from "@/types";

import { ALLOWED_TAG_TYPES } from "@/constants/tag.constants";
import { toUnixMillis } from "@/utils/timestamp";

const LOG_PREFIX = "[Tag Service]";
const MAX_DAILY_TAGS = 10;
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
        throw new ApiError(429, ERROR_MESSAGES.NO_TAGS_REMAINING);
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
    if (error instanceof ApiError) {
      throw error;
    }
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
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
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Check if a user has specific tags
 */
export const getUserTags = async (
  fingerprintId: string,
): Promise<{
  hasTags: boolean;
  activeTags: string[];
}> => {
  try {
    console.log(`${LOG_PREFIX} Checking tags for user ${fingerprintId}`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const activeTags = data.tags ? Object.keys(data.tags) : [];

    return {
      hasTags: activeTags.length > 0,
      activeTags,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getUserTags:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get tag leaderboard
 */
export const getTagLeaderboard = async ({
  timeFrame,
  limit,
  offset,
  currentUserId,
}: {
  timeFrame: "daily" | "weekly" | "monthly" | "allTime";
  limit: number;
  offset: number;
  currentUserId?: string;
}): Promise<TagLeaderboardResponse> => {
  try {
    console.log(`${LOG_PREFIX} Getting tag leaderboard for timeframe: ${timeFrame}`);
    const db = getFirestore();
    const statsRef = db.collection(COLLECTIONS.TAG_STATS);

    // Determine which field to sort by based on timeframe
    const sortField =
      timeFrame === "daily"
        ? "dailyTags"
        : timeFrame === "weekly"
          ? "weeklyTags"
          : timeFrame === "monthly"
            ? "monthlyTags"
            : "totalTagsMade";

    // Get leaderboard entries
    const query = statsRef
      .orderBy(sortField, "desc")
      .orderBy("lastTagAt", "desc")
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();
    const entries: TagLeaderboardEntry[] = [];
    let userRank: number | undefined;

    // If we need to find user's rank and they're not in the current page
    if (currentUserId && !snapshot.docs.some((doc) => doc.id === currentUserId)) {
      const userQuery = statsRef.orderBy(sortField, "desc").orderBy("lastTagAt", "desc");

      const allDocs = await userQuery.get();
      userRank = allDocs.docs.findIndex((doc) => doc.id === currentUserId) + 1;
      if (userRank === 0) userRank = undefined;
    }

    snapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as TagStats;
      entries.push({
        fingerprintId: data.fingerprintId,
        totalTags:
          timeFrame === "daily"
            ? data.dailyTags
            : timeFrame === "weekly"
              ? data.weeklyTags
              : timeFrame === "monthly"
                ? data.monthlyTags
                : data.totalTagsMade,
        lastTagAt: data.lastTagAt,
        streak: data.streak,
        tagTypes: data.tagTypes || {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });

      // If this is the current user, set their rank
      if (doc.id === currentUserId) {
        userRank = offset + entries.length;
      }
    });

    const response: TagLeaderboardResponse = {
      timeFrame,
      entries: entries.map((entry) => ({
        ...entry,
        lastTagAt: toUnixMillis(entry.lastTagAt),
        createdAt: toUnixMillis(entry.createdAt),
        updatedAt: toUnixMillis(entry.updatedAt),
      })),
      userRank,
      generatedAt: toUnixMillis(Timestamp.now()),
    };

    return response;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getTagLeaderboard:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
