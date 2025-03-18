import { ApiError } from "../utils";
import { COLLECTIONS, ERROR_MESSAGES, TAG_LIMITS } from "../constants";
import { ALLOWED_TAG_TYPES } from "../constants/features/tags";
import {
  TagData,
  TagLimitData,
  TagLeaderboardResponse,
  TagStats,
  TagUserParams,
} from "../schemas/tag.schema";
import { getDb, formatDocument, formatDocuments, handleMongoError } from "../utils/mongodb";
import { stringIdFilter } from "../utils/mongo-filters";
import { ObjectId } from "mongodb";

const LOG_PREFIX = "[Tag Service]";
const MAX_DAILY_TAGS = TAG_LIMITS.DAILY_TAGS;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

// Pure functions
export function isValidTagAttempt(
  taggerUsername: string,
  targetUsername: string,
  tagType: string,
): boolean {
  if (taggerUsername === targetUsername) {
    return false; // Can't tag yourself
  }
  if (!Object.values(ALLOWED_TAG_TYPES).includes(tagType as any)) {
    return false; // Invalid tag type
  }
  return true;
}

export function hasTagType(tagTypes: Record<string, number>, tagType: string): boolean {
  return Boolean(tagTypes && tagTypes[tagType] && tagTypes[tagType] > 0);
}

export function createTagData(taggerId: string, tagType: string, platform: string): TagData {
  return {
    type: tagType,
    taggedBy: taggerId,
    taggedAt: Date.now(),
    platform: platform as any,
  };
}

export function shouldResetDailyTags(lastReset: number): boolean {
  const now = Date.now();
  return now - lastReset > MILLISECONDS_IN_DAY;
}

export function createInitialTagLimits(): TagLimitData {
  const now = Date.now();
  return {
    firstTaggedAt: now,
    remainingDailyTags: MAX_DAILY_TAGS,
    lastTagResetAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateNewTagLimits(
  existingLimits: TagLimitData,
  hasEarnedTag: boolean,
): TagLimitData {
  const now = Date.now();
  let { remainingDailyTags, lastTagResetAt } = existingLimits;

  // Check if daily limit should be reset
  if (shouldResetDailyTags(lastTagResetAt)) {
    remainingDailyTags = MAX_DAILY_TAGS;
    lastTagResetAt = now;
  }

  // If user has already been tagged, they get rewarded with extra tags
  if (hasEarnedTag) {
    remainingDailyTags += 1; // Bonus tag for being tagged
  } else if (remainingDailyTags > 0) {
    remainingDailyTags -= 1; // Use a tag
  }

  return {
    ...existingLimits,
    remainingDailyTags,
    lastTagResetAt,
    updatedAt: now,
  };
}

// Database operations

/**
 * Update the tag limits for a user
 */
export async function updateUserTagLimits(
  userId: string,
  newLimits: TagLimitData,
): Promise<TagLimitData> {
  try {
    const db = await getDb();

    // Create user filter with string ID
    const userFilter = stringIdFilter("_id", userId);

    // Upsert tag limits doc
    const result = await db.collection(COLLECTIONS.ANON_USERS).updateOne(
      userFilter,
      {
        $set: {
          tagLimits: newLimits,
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          createdAt: Date.now(),
        },
      },
      { upsert: true },
    );

    if (!result.acknowledged) {
      throw new Error(`Failed to update tag limits for user ${userId}`);
    }

    return newLimits;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update tag limits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Add a tag to a user's profile
 */
export async function addTagToUser(userId: string, tag: TagData): Promise<void> {
  try {
    const db = await getDb();

    // Create user filter with string ID
    const userFilter = stringIdFilter("_id", userId);

    // Add tag to user document
    const result = await db.collection(COLLECTIONS.ANON_USERS).updateOne(userFilter, {
      $push: { taggedBy: tag },
      $set: { updatedAt: Date.now() },
    });

    if (!result.acknowledged) {
      throw new Error(`Failed to add tag to user ${userId}`);
    }

    // Update tag stats
    await db.collection(COLLECTIONS.TAG_STATS).updateOne(
      { fingerprintId: tag.taggedBy },
      {
        $inc: {
          totalTagsMade: 1,
          dailyTags: 1,
          weeklyTags: 1,
          monthlyTags: 1,
          [`tagTypes.${tag.type}`]: 1,
        },
        $set: {
          lastTagAt: Date.now(),
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          createdAt: Date.now(),
          streak: 1,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to add tag:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Process tag limits for a user
 */
export async function processTagLimits(taggerId: string, targetHasTag: boolean): Promise<number> {
  try {
    const db = await getDb();

    // Create tagger filter with string ID
    const taggerFilter = stringIdFilter("_id", taggerId);

    // Get tagger to check current limits
    const user = await db.collection(COLLECTIONS.ANON_USERS).findOne(taggerFilter);

    // Initialize or update tag limits
    let tagLimits: TagLimitData;
    if (!user || !user.tagLimits) {
      tagLimits = createInitialTagLimits();
    } else {
      tagLimits = calculateNewTagLimits(user.tagLimits, targetHasTag);
    }

    // Update the user's tag limits
    await updateUserTagLimits(taggerId, tagLimits);

    return tagLimits.remainingDailyTags;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to process tag limits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Get or create users involved in a tag
 * @param taggerUsername
 * @param targetUsername
 * @param platform
 */
export async function getOrCreateUsers(
  taggerUsername: string,
  targetUsername: string,
  platform: string,
): Promise<{ taggerId: string; targetId: string }> {
  try {
    const db = await getDb();
    const now = Date.now();

    // Create or get tagger
    const taggerResult = await db.collection(COLLECTIONS.ANON_USERS).findOneAndUpdate(
      { username: taggerUsername, platform },
      {
        $setOnInsert: {
          username: taggerUsername,
          platform,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    // Create or get target
    const targetResult = await db.collection(COLLECTIONS.ANON_USERS).findOneAndUpdate(
      { username: targetUsername, platform },
      {
        $setOnInsert: {
          username: targetUsername,
          platform,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!taggerResult.value || !targetResult.value) {
      throw new Error("Failed to get or create users");
    }

    return {
      taggerId: taggerResult.value._id.toString(),
      targetId: targetResult.value._id.toString(),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get or create users:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.USER_NOT_FOUND);
  }
}

/**
 * Tag a user by their social identity
 */
export async function tagUserBySocialIdentity({
  taggerUsername,
  targetUsername,
  platform,
  tagType,
}: TagUserParams): Promise<{ success: boolean; message: string; remainingTags: number }> {
  try {
    if (!isValidTagAttempt(taggerUsername, targetUsername, tagType)) {
      return {
        success: false,
        message: "Invalid tag attempt",
        remainingTags: 0,
      };
    }

    const db = await getDb();

    // Get or create users
    const { taggerId, targetId } = await getOrCreateUsers(taggerUsername, targetUsername, platform);

    // Create target filter with string ID
    const targetFilter = stringIdFilter("_id", targetId);

    // Check if target is already tagged by tagger
    const targetUser = await db.collection(COLLECTIONS.ANON_USERS).findOne(targetFilter);

    if (
      targetUser?.taggedBy?.some(
        (tag: TagData) => tag.taggedBy === taggerId && tag.type === tagType,
      )
    ) {
      return {
        success: false,
        message: "User already tagged",
        remainingTags: 0,
      };
    }

    // Check tag limits
    const targetHasTag =
      targetUser?.taggedBy?.some((tag: TagData) => tag.taggedBy === taggerId) || false;
    const remainingTags = await processTagLimits(taggerId, targetHasTag);

    if (remainingTags <= 0) {
      return {
        success: false,
        message: "Daily tag limit reached",
        remainingTags: 0,
      };
    }

    // Add tag
    const tag = createTagData(taggerId, tagType, platform);
    await addTagToUser(targetId, tag);

    return {
      success: true,
      message: "User tagged successfully",
      remainingTags,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error tagging user:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.USER_NOT_FOUND);
  }
}

/**
 * Get tags for a user
 */
export async function getUserTags(username: string, platform?: string): Promise<TagData[]> {
  try {
    const db = await getDb();

    // Find user
    const query: any = { username };
    if (platform) {
      query.platform = platform;
    }

    const user = await db.collection(COLLECTIONS.ANON_USERS).findOne(query);

    if (!user) {
      return [];
    }

    return user.taggedBy || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting user tags:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.USER_NOT_FOUND);
  }
}

/**
 * Get tag leaderboard
 */
export async function getTagLeaderboard(
  timeFrame: "daily" | "weekly" | "monthly" | "allTime" = "allTime",
  limit = 10,
  offset = 0,
): Promise<TagLeaderboardResponse> {
  try {
    const db = await getDb();
    const now = Date.now();

    // Calculate time range
    let startTime = 0;
    switch (timeFrame) {
      case "daily":
        startTime = now - MILLISECONDS_IN_DAY;
        break;
      case "weekly":
        startTime = now - MILLISECONDS_IN_DAY * 7;
        break;
      case "monthly":
        startTime = now - MILLISECONDS_IN_DAY * 30;
        break;
      default:
        startTime = 0;
    }

    // Query tag stats that have been updated since startTime
    const query: any = {};
    if (timeFrame !== "allTime") {
      query.lastTagAt = { $gte: startTime };
    }

    // Get leaderboard entries
    const stats = await db
      .collection(COLLECTIONS.TAG_STATS)
      .find(query)
      .sort({ totalTagsMade: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const leaderboard: TagLeaderboardResponse = {
      timeFrame,
      entries: stats.map((stat: any) => ({
        fingerprintId: stat.fingerprintId,
        totalTags: stat.totalTagsMade,
        lastTagAt: stat.lastTagAt,
        createdAt: stat.createdAt,
        updatedAt: stat.updatedAt,
        streak: stat.streak || 0,
        tagTypes: stat.tagTypes || {},
      })),
      generatedAt: now,
    };

    return leaderboard;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting tag leaderboard:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
