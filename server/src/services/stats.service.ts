import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";
import { Stats, StatsResponse } from "../schemas";
import { getDb, formatDocument } from "../utils/mongodb";
import { stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Stats Service]";

export const getStats = async (profileId: string): Promise<StatsResponse> => {
  console.log(`${LOG_PREFIX} Getting stats for profile: ${profileId}`);
  try {
    const db = await getDb();
    const profileFilter = stringIdFilter("id", profileId);
    const doc = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);

    if (!doc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const data = formatDocument(doc) as Stats;
    return data;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting stats:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateStats = async (
  profileId: string,
  updates: Partial<Stats>,
): Promise<StatsResponse> => {
  console.log(`${LOG_PREFIX} Updating stats for profile: ${profileId}`);
  try {
    const db = await getDb();
    const profileFilter = stringIdFilter("id", profileId);
    const doc = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);

    if (!doc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const now = Date.now();
    const updateData = {
      $set: {
        ...updates,
        lastActive: now,
        updatedAt: now,
      },
    };

    await db.collection(COLLECTIONS.STATS).updateOne(profileFilter, updateData);
    return getStats(profileId);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating stats:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const recordHistory = async (profileId: string, stats: StatsResponse): Promise<void> => {
  try {
    console.log(`${LOG_PREFIX} Recording history for profile: ${profileId}`);
    const db = await getDb();
    await db.collection(COLLECTIONS.STATS_HISTORY).insertOne({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      profileId,
      stats,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error recording history:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateLastActive = async (profileId: string): Promise<void> => {
  try {
    console.log(`${LOG_PREFIX} Updating last active for profile: ${profileId}`);
    const db = await getDb();
    const profileFilter = stringIdFilter("id", profileId);
    const doc = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);

    if (!doc) {
      throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const now = Date.now();
    await db.collection(COLLECTIONS.STATS).updateOne(profileFilter, {
      $set: {
        lastActive: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating last active:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const calculateSuccessRate = async (profileId: string): Promise<number> => {
  try {
    console.log(`${LOG_PREFIX} Calculating success rate for profile: ${profileId}`);
    const db = await getDb();
    const profileFilter = stringIdFilter("id", profileId);
    const doc = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);

    if (!doc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    return doc.successRate || 0;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error calculating success rate:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateReputation = async (
  profileId: string,
  change: number,
): Promise<StatsResponse> => {
  try {
    console.log(`${LOG_PREFIX} Updating reputation for profile: ${profileId}`);
    const db = await getDb();
    const profileFilter = stringIdFilter("id", profileId);
    const stats = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);

    if (!stats) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const newReputation = Math.max(0, stats.reputation + change);
    return updateStats(profileId, { reputation: newReputation });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating reputation:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const createStats = async (profileId: string): Promise<StatsResponse> => {
  try {
    console.log(`${LOG_PREFIX} Creating stats for profile: ${profileId}`);
    const db = await getDb();

    // Check if stats already exist
    const profileFilter = stringIdFilter("id", profileId);
    const existingStats = await db.collection(COLLECTIONS.STATS).findOne(profileFilter);
    if (existingStats) {
      return formatDocument(existingStats) as StatsResponse;
    }

    const now = Date.now();
    const newStats: Stats = {
      id: profileId,
      profileId,
      missionsCompleted: 0,
      successRate: 0,
      totalRewards: 0,
      reputation: 0,
      joinedAt: now,
      lastActive: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.STATS).insertOne(newStats);
    return newStats;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating stats:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
