import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { toUnixMillis } from "../utils/timestamp";
import {
  ProfileStats,
  ProfileStatsModel,
  StatsResponse,
  StatsHistoryModel,
  StatsHistory,
} from "../types/stats.types";

// Type for API response that converts Timestamps to Unix time
type StatsHistoryResponse = Omit<StatsHistory, "timestamp"> & {
  timestamp: number;
};

export const statsService = {
  async initializeStats(profileId: string): Promise<StatsResponse> {
    console.log("[initializeStats] Starting with profileId:", profileId);
    const db = getFirestore();
    const statsCollection = db.collection(COLLECTIONS.STATS);

    try {
      // Check if stats already exist for this profile
      const existing = await statsCollection.where("id", "==", profileId).limit(1).get();
      console.log("[initializeStats] Existing check result:", { exists: !existing.empty });

      if (!existing.empty) {
        throw new ApiError(400, ERROR_MESSAGES.STATS_EXIST);
      }

      const now = Timestamp.now();
      const stats: ProfileStatsModel = {
        id: profileId, // Use the profileId as the stats document ID
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
        joinedAt: now,
        lastActive: now,
        createdAt: now,
        updatedAt: now,
      };

      console.log("[initializeStats] Creating new stats:", { id: stats.id });
      await statsCollection.doc(stats.id).set(stats);

      return {
        ...stats,
        joinedAt: toUnixMillis(stats.joinedAt),
        lastActive: toUnixMillis(stats.lastActive),
        createdAt: toUnixMillis(stats.createdAt),
        updatedAt: toUnixMillis(stats.updatedAt),
      };
    } catch (error) {
      console.error("[initializeStats] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async getStats(profileId: string): Promise<StatsResponse> {
    console.log("[getStats] Starting with profileId:", profileId);
    const db = getFirestore();
    const statsCollection = db.collection(COLLECTIONS.STATS);

    try {
      const doc = await statsCollection.doc(profileId).get();
      console.log("[getStats] Stats found:", { found: doc.exists });

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
      }

      const data = doc.data() as ProfileStatsModel;
      return {
        ...data,
        joinedAt: toUnixMillis(data.joinedAt),
        lastActive: toUnixMillis(data.lastActive),
        createdAt: toUnixMillis(data.createdAt),
        updatedAt: toUnixMillis(data.updatedAt),
      };
    } catch (error) {
      console.error("[getStats] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateStats(
    profileId: string,
    updates: Partial<
      Pick<ProfileStats, "missionsCompleted" | "successRate" | "totalRewards" | "reputation">
    >,
  ): Promise<StatsResponse> {
    console.log("[updateStats] Starting with:", { profileId, updates });
    const db = getFirestore();
    const statsCollection = db.collection(COLLECTIONS.STATS);

    try {
      const currentStats = await this.getStats(profileId);
      const now = Timestamp.now();

      const dbUpdates: Partial<ProfileStatsModel> = {
        ...updates,
        updatedAt: now,
        lastActive: now,
      };

      console.log("[updateStats] Updating stats");
      await statsCollection.doc(profileId).update(dbUpdates);

      const updatedStats = {
        ...currentStats,
        ...updates,
        updatedAt: toUnixMillis(now),
        lastActive: toUnixMillis(now),
      };

      await this.recordHistory(profileId, updatedStats);

      return updatedStats;
    } catch (error) {
      console.error("[updateStats] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
        updates,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async recordHistory(profileId: string, stats: StatsResponse): Promise<void> {
    console.log("[recordHistory] Starting with:", { profileId });
    const db = getFirestore();
    const historyCollection = db.collection(COLLECTIONS.STATS_HISTORY);

    try {
      const now = Timestamp.now();
      const historyEntry: StatsHistoryModel = {
        id: historyCollection.doc().id,
        timestamp: now,
        stats: {
          ...stats,
          joinedAt: Timestamp.fromMillis(stats.joinedAt),
          lastActive: Timestamp.fromMillis(stats.lastActive),
          createdAt: Timestamp.fromMillis(stats.createdAt),
          updatedAt: Timestamp.fromMillis(stats.updatedAt),
        },
      };

      console.log("[recordHistory] Creating history entry");
      await historyCollection.add(historyEntry);
    } catch (error) {
      console.error("[recordHistory] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      // Don't throw here, just log the error
      // We don't want to fail the main operation if history recording fails
    }
  },

  async getStatsHistory(
    profileId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<StatsHistoryResponse[]> {
    console.log("[getStatsHistory] Starting with:", { profileId, startDate, endDate });
    const db = getFirestore();
    const historyCollection = db.collection(COLLECTIONS.STATS_HISTORY);

    try {
      let query = historyCollection
        .where("profileId", "==", profileId)
        .orderBy("timestamp", "desc");

      if (startDate) {
        query = query.where("timestamp", ">=", Timestamp.fromDate(startDate));
      }
      if (endDate) {
        query = query.where("timestamp", "<=", Timestamp.fromDate(endDate));
      }

      const snapshot = await query.get();
      console.log("[getStatsHistory] Found history entries:", { count: snapshot.size });

      return snapshot.docs.map((doc) => {
        const data = doc.data() as StatsHistory & { timestamp: Timestamp };
        return {
          ...data,
          timestamp: data.timestamp.toMillis(),
        };
      });
    } catch (error) {
      console.error("[getStatsHistory] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateLastActive(profileId: string): Promise<void> {
    console.log("[updateLastActive] Starting with profileId:", profileId);
    const db = getFirestore();
    const statsCollection = db.collection(COLLECTIONS.STATS);

    try {
      const doc = await statsCollection.doc(profileId).get();
      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
      }

      const now = Timestamp.now();
      console.log("[updateLastActive] Updating last active timestamp");
      await statsCollection.doc(profileId).update({
        lastActive: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error("[updateLastActive] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async calculateSuccessRate(profileId: string): Promise<number> {
    console.log("[calculateSuccessRate] Starting with profileId:", profileId);
    try {
      const stats = await this.getStats(profileId);
      if (stats.missionsCompleted === 0) return 0;
      return stats.successRate;
    } catch (error) {
      console.error("[calculateSuccessRate] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateReputation(profileId: string, change: number): Promise<StatsResponse> {
    console.log("[updateReputation] Starting with:", { profileId, change });
    try {
      const stats = await this.getStats(profileId);
      const newReputation = Math.max(0, stats.reputation + change); // Reputation cannot go below 0

      return this.updateStats(profileId, {
        reputation: newReputation,
      });
    } catch (error) {
      console.error("[updateReputation] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
        change,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
};
