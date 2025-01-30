import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ApiError } from "../../utils/error";
import { ERROR_MESSAGES } from "../../constants/api";
import { StatsModel, StatsResponse } from "../types/stats.types";

class StatsService {
  private db = getFirestore();

  async getStats(profileId: string): Promise<StatsResponse> {
    try {
      const doc = await this.db.collection(COLLECTIONS.STATS).doc(profileId).get();

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
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
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  }

  async updateStats(profileId: string, updates: Partial<StatsModel>): Promise<StatsResponse> {
    try {
      const doc = await this.db.collection(COLLECTIONS.STATS).doc(profileId).get();

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
      }

      const now = Timestamp.now();
      const updateData = {
        ...updates,
        lastActive: now,
        updatedAt: now,
      };

      await doc.ref.update(updateData);
      return this.getStats(profileId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  }

  async recordHistory(profileId: string, stats: StatsResponse): Promise<void> {
    try {
      const historyRef = this.db.collection(COLLECTIONS.STATS_HISTORY);
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
      // Don't throw here as per test implementation
    }
  }

  async updateLastActive(profileId: string): Promise<void> {
    try {
      const doc = await this.db.collection(COLLECTIONS.STATS).doc(profileId).get();

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.STATS_NOT_FOUND);
      }

      const now = Timestamp.now();
      await doc.ref.update({
        lastActive: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  }

  async calculateSuccessRate(profileId: string): Promise<number> {
    try {
      const stats = await this.getStats(profileId);
      return stats.successRate;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  }

  async updateReputation(profileId: string, change: number): Promise<StatsResponse> {
    try {
      const stats = await this.getStats(profileId);
      const newReputation = Math.max(0, stats.reputation + change);
      return this.updateStats(profileId, { reputation: newReputation });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  }
}

export const statsService = new StatsService();
