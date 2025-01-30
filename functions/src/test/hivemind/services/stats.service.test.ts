import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../constants/collections";
import { cleanDatabase } from "../../utils/testUtils";
import { ERROR_MESSAGES } from "../../../constants/api";
import { statsService } from "../../../hivemind/services/stats.service";
import { profileService } from "../../../hivemind/services/profile.service";

describe("StatsService", () => {
  const db = getFirestore();
  const testWalletAddress = "0x1234567890123456789012345678901234567890";
  const testFingerprintId = "test-fingerprint-id";

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // Helper function to create a profile and get its stats
  const createProfileWithStats = async () => {
    const profile = await profileService.createProfile({
      walletAddress: testWalletAddress,
      fingerprintId: testFingerprintId,
      username: "testuser",
    });
    const stats = await statsService.getStats(profile.id);
    return { profile, stats };
  };

  describe("getStats", () => {
    it("should get stats for a profile", async () => {
      const { profile, stats } = await createProfileWithStats();

      expect(stats).toMatchObject({
        id: profile.id,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
      expect(typeof stats.joinedAt).toBe("number");
      expect(typeof stats.lastActive).toBe("number");
      expect(typeof stats.createdAt).toBe("number");
      expect(typeof stats.updatedAt).toBe("number");
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.getStats("non-existent-id")).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });

  describe("updateStats", () => {
    it("should update stats for a profile", async () => {
      const { profile, stats: created } = await createProfileWithStats();
      const updates = {
        missionsCompleted: 1,
        successRate: 100,
        totalRewards: 50,
        reputation: 10,
      };

      const updated = await statsService.updateStats(profile.id, updates);

      expect(updated).toMatchObject({
        id: profile.id,
        ...updates,
      });
      expect(updated.joinedAt).toBe(created.joinedAt);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.lastActive).toBeGreaterThan(created.lastActive);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      // Verify in database
      const doc = await db.collection(COLLECTIONS.STATS).doc(profile.id).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        id: profile.id,
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
      const { profile, stats } = await createProfileWithStats();
      await statsService.recordHistory(profile.id, stats);

      const snapshot = await db
        .collection(COLLECTIONS.STATS_HISTORY)
        .where("stats.id", "==", profile.id)
        .get();

      expect(snapshot.empty).toBe(false);
      const data = snapshot.docs[0].data();
      expect(data.stats).toMatchObject({
        id: profile.id,
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
      const { profile, stats: created } = await createProfileWithStats();

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await statsService.updateLastActive(profile.id);

      const updated = await statsService.getStats(profile.id);
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
      const { profile } = await createProfileWithStats();
      const rate = await statsService.calculateSuccessRate(profile.id);
      expect(rate).toBe(0);
    });

    it("should return success rate if missions completed", async () => {
      const { profile } = await createProfileWithStats();
      await statsService.updateStats(profile.id, {
        missionsCompleted: 10,
        successRate: 80,
      });

      const rate = await statsService.calculateSuccessRate(profile.id);
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
      const { profile } = await createProfileWithStats();
      const updated = await statsService.updateReputation(profile.id, 10);
      expect(updated.reputation).toBe(10);
    });

    it("should not allow reputation to go below 0", async () => {
      const { profile } = await createProfileWithStats();
      const updated = await statsService.updateReputation(profile.id, -10);
      expect(updated.reputation).toBe(0);
    });

    it("should handle both positive and negative changes", async () => {
      const { profile } = await createProfileWithStats();

      let updated = await statsService.updateReputation(profile.id, 20);
      expect(updated.reputation).toBe(20);

      updated = await statsService.updateReputation(profile.id, -5);
      expect(updated.reputation).toBe(15);
    });

    it("should throw error if stats not found", async () => {
      await expect(statsService.updateReputation("non-existent-id", 10)).rejects.toThrow(
        ERROR_MESSAGES.STATS_NOT_FOUND,
      );
    });
  });
});
