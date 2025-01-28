import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { cleanDatabase } from "../utils/testUtils";
import { statsService } from "../../services/stats.service";
import { ERROR_MESSAGES } from "../../constants/api";

describe("StatsService", () => {
  const db = getFirestore();
  const testProfileId = "test-profile-id";

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("initializeStats", () => {
    it("should initialize stats for a profile", async () => {
      const stats = await statsService.initializeStats(testProfileId);

      expect(stats).toMatchObject({
        id: testProfileId,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
      expect(typeof stats.joinedAt).toBe("number");
      expect(typeof stats.lastActive).toBe("number");
      expect(typeof stats.createdAt).toBe("number");
      expect(typeof stats.updatedAt).toBe("number");

      // Verify in database
      const doc = await db.collection(COLLECTIONS.STATS).doc(testProfileId).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        id: testProfileId,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
      expect(data?.joinedAt).toBeInstanceOf(Timestamp);
      expect(data?.lastActive).toBeInstanceOf(Timestamp);
      expect(data?.createdAt).toBeInstanceOf(Timestamp);
      expect(data?.updatedAt).toBeInstanceOf(Timestamp);
    });

    it("should throw error if stats already exist", async () => {
      await statsService.initializeStats(testProfileId);
      await expect(statsService.initializeStats(testProfileId)).rejects.toThrow(
        ERROR_MESSAGES.STATS_EXIST,
      );
    });
  });

  describe("getStats", () => {
    it("should get stats for a profile", async () => {
      const created = await statsService.initializeStats(testProfileId);
      const stats = await statsService.getStats(testProfileId);

      expect(stats).toMatchObject({
        id: testProfileId,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
      expect(stats.joinedAt).toBe(created.joinedAt);
      expect(stats.lastActive).toBe(created.lastActive);
      expect(stats.createdAt).toBe(created.createdAt);
      expect(stats.updatedAt).toBe(created.updatedAt);
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.getStats("non-existent-id")).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });

  describe("updateStats", () => {
    it("should update stats for a profile", async () => {
      const created = await statsService.initializeStats(testProfileId);
      const updates = {
        missionsCompleted: 1,
        successRate: 100,
        totalRewards: 50,
        reputation: 10,
      };

      const updated = await statsService.updateStats(testProfileId, updates);

      expect(updated).toMatchObject({
        id: testProfileId,
        ...updates,
      });
      expect(updated.joinedAt).toBe(created.joinedAt);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.lastActive).toBeGreaterThan(created.lastActive);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      // Verify in database
      const doc = await db.collection(COLLECTIONS.STATS).doc(testProfileId).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        id: testProfileId,
        ...updates,
      });
      expect(data?.joinedAt).toBeInstanceOf(Timestamp);
      expect(data?.lastActive).toBeInstanceOf(Timestamp);
      expect(data?.createdAt).toBeInstanceOf(Timestamp);
      expect(data?.updatedAt).toBeInstanceOf(Timestamp);
    });

    it("should throw error if stats not found", async () => {
      await expect(
        statsService.updateStats("non-existent-id", { missionsCompleted: 1 }),
      ).rejects.toThrow(ERROR_MESSAGES.STATS_NOT_FOUND);
    });
  });

  describe("recordHistory", () => {
    it("should record stats history", async () => {
      const stats = await statsService.initializeStats(testProfileId);
      await statsService.recordHistory(testProfileId, stats);

      const snapshot = await db
        .collection(COLLECTIONS.STATS_HISTORY)
        .where("stats.id", "==", testProfileId)
        .get();

      expect(snapshot.empty).toBe(false);
      const data = snapshot.docs[0].data();
      expect(data.stats).toMatchObject({
        id: testProfileId,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
      expect(data.timestamp).toBeInstanceOf(Timestamp);
      expect(data.stats.joinedAt).toBeInstanceOf(Timestamp);
      expect(data.stats.lastActive).toBeInstanceOf(Timestamp);
      expect(data.stats.createdAt).toBeInstanceOf(Timestamp);
      expect(data.stats.updatedAt).toBeInstanceOf(Timestamp);
    });
  });

  describe("updateLastActive", () => {
    it("should update last active timestamp", async () => {
      const created = await statsService.initializeStats(testProfileId);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await statsService.updateLastActive(testProfileId);

      const updated = await statsService.getStats(testProfileId);
      expect(updated.lastActive).toBeGreaterThan(created.lastActive);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.updateLastActive("non-existent-id")).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });

  describe("calculateSuccessRate", () => {
    it("should return 0 if no missions completed", async () => {
      await statsService.initializeStats(testProfileId);
      const rate = await statsService.calculateSuccessRate(testProfileId);
      expect(rate).toBe(0);
    });

    it("should return success rate if missions completed", async () => {
      await statsService.initializeStats(testProfileId);
      await statsService.updateStats(testProfileId, {
        missionsCompleted: 10,
        successRate: 80,
      });

      const rate = await statsService.calculateSuccessRate(testProfileId);
      expect(rate).toBe(80);
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.calculateSuccessRate("non-existent-id")).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });

  describe("updateReputation", () => {
    it("should update reputation", async () => {
      await statsService.initializeStats(testProfileId);
      const updated = await statsService.updateReputation(testProfileId, 10);
      expect(updated.reputation).toBe(10);
    });

    it("should not allow reputation to go below 0", async () => {
      await statsService.initializeStats(testProfileId);
      const updated = await statsService.updateReputation(testProfileId, -10);
      expect(updated.reputation).toBe(0);
    });

    it("should handle both positive and negative changes", async () => {
      await statsService.initializeStats(testProfileId);

      let updated = await statsService.updateReputation(testProfileId, 20);
      expect(updated.reputation).toBe(20);

      updated = await statsService.updateReputation(testProfileId, -5);
      expect(updated.reputation).toBe(15);
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.updateReputation("non-existent-id", 10)).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });
});
