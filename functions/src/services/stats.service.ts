import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";
import { StatsModel, StatsResponse } from "../types";

export const getStats = async (profileId: string): Promise<StatsResponse> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.STATS).doc(profileId).get();

    if (!doc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const data = doc.data() as StatsModel;
    return {
      ...data,
      joinedAt: data.joinedAt.toMillis(),
      lastActive: data.lastActive.toMillis(),
      createdAt: data.createdAt.toMillis(),
      updatedAt: data.updatedAt.toMillis(),
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateStats = async (
  profileId: string,
  updates: Partial<StatsModel>,
): Promise<StatsResponse> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.STATS).doc(profileId).get();

    if (!doc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const now = Timestamp.now();
    const updateData = {
      ...updates,
      lastActive: now,
      updatedAt: now,
    };

    await doc.ref.update(updateData);
    return getStats(profileId);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const recordHistory = async (profileId: string, stats: StatsResponse): Promise<void> => {
  try {
    const db = getFirestore();
    const historyRef = db.collection(COLLECTIONS.STATS_HISTORY);
    await historyRef.add({
      timestamp: Timestamp.now(),
      stats: {
        ...stats,
        joinedAt: Timestamp.fromMillis(stats.joinedAt),
        lastActive: Timestamp.fromMillis(stats.lastActive),
        createdAt: Timestamp.fromMillis(stats.createdAt),
        updatedAt: Timestamp.fromMillis(stats.updatedAt),
      },
    });
  } catch (error) {
    console.error("[Stats Service] Error recording history:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateLastActive = async (profileId: string): Promise<void> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.STATS).doc(profileId).get();

    if (!doc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const now = Timestamp.now();
    await doc.ref.update({
      lastActive: now,
      updatedAt: now,
    });
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const calculateSuccessRate = async (profileId: string): Promise<number> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.STATS).doc(profileId).get();

    if (!doc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.STATS_NOT_FOUND);
    }

    const data = doc.data();
    return data?.successRate || 0;
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateReputation = async (
  profileId: string,
  change: number,
): Promise<StatsResponse> => {
  try {
    const db = getFirestore();
    const stats = await db.collection(COLLECTIONS.STATS).doc(profileId).get();
    const newReputation = Math.max(0, stats.data()?.reputation + change);
    return updateStats(profileId, { reputation: newReputation });
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
