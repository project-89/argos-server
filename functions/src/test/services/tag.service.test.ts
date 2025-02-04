import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore } from "firebase-admin/firestore";
import {
  tagUser,
  hasTag,
  getTagHistory,
  getUserTags,
  getTagLeaderboard,
} from "../../services/tag.service";
import { ERROR_MESSAGES, COLLECTIONS } from "../../constants";
import { ApiError } from "../../utils/error";
import { cleanDatabase, createTestData } from "../utils/testUtils";

describe("Tag Service", () => {
  let testTaggerId: string;
  let testTargetId: string;
  let user1FingerprintId: string;
  let user2FingerprintId: string;
  let user3FingerprintId: string;
  const nonExistentId = "non-existent-fingerprint";
  const testTagType = "it";

  beforeEach(async () => {
    await cleanDatabase();

    // Create test users with specific tag setup
    const taggerData = await createTestData({
      initialTags: {
        [testTagType]: { type: testTagType, taggedBy: "initial", taggedAt: new Date() },
      },
      skipCleanup: true,
    });
    testTaggerId = taggerData.fingerprintId;

    const targetData = await createTestData({ skipCleanup: true });
    testTargetId = targetData.fingerprintId;

    // Create users for leaderboard tests
    const user1Data = await createTestData({ skipCleanup: true });
    user1FingerprintId = user1Data.fingerprintId;
    const user2Data = await createTestData({ skipCleanup: true });
    user2FingerprintId = user2Data.fingerprintId;
    const user3Data = await createTestData({ skipCleanup: true });
    user3FingerprintId = user3Data.fingerprintId;

    // Verify fingerprint setup
    const db = getFirestore();
    const taggerDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTaggerId).get();
    const taggerTags = taggerDoc.data()?.tags || {};
    expect(taggerTags[testTagType]).toBeDefined();
    expect(taggerTags[testTagType].type).toBe(testTagType);

    const targetDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTargetId).get();
    expect(targetDoc.exists).toBe(true);

    // Set up tag stats for leaderboard tests
    const now = new Date();
    const testStats = [
      {
        id: user1FingerprintId,
        fingerprintId: user1FingerprintId,
        totalTagsMade: 100,
        lastTagAt: now,
        dailyTags: 10,
        weeklyTags: 50,
        monthlyTags: 80,
        streak: 5,
        tagTypes: { it: 100 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: user2FingerprintId,
        fingerprintId: user2FingerprintId,
        totalTagsMade: 80,
        lastTagAt: now,
        dailyTags: 15,
        weeklyTags: 40,
        monthlyTags: 60,
        streak: 3,
        tagTypes: { it: 80 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: user3FingerprintId,
        fingerprintId: user3FingerprintId,
        totalTagsMade: 120,
        lastTagAt: now,
        dailyTags: 8,
        weeklyTags: 60,
        monthlyTags: 100,
        streak: 7,
        tagTypes: { it: 120 },
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Add test stats to database
    for (const stat of testStats) {
      await db.collection(COLLECTIONS.TAG_STATS).doc(stat.id).set(stat);
    }

    // Verify tag stats setup
    const statsSnapshot = await db.collection(COLLECTIONS.TAG_STATS).get();
    expect(statsSnapshot.size).toBe(3);
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("tagUser", () => {
    it("should successfully tag a user with a specific tag type", async () => {
      const result = await tagUser({
        taggerFingerprintId: testTaggerId,
        targetFingerprintId: testTargetId,
        tagType: testTagType,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(`Successfully tagged user with ${testTagType}`);

      // Verify the tag was added
      const db = getFirestore();
      const targetDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTargetId).get();
      const targetData = targetDoc.data();

      expect(targetData?.tags[testTagType]).toBeDefined();
      expect(targetData?.tags[testTagType].type).toBe(testTagType);
      expect(targetData?.tags[testTagType].taggedBy).toBe(testTaggerId);
      expect(targetData?.tags[testTagType].taggedAt).toBeDefined();
    });

    it("should prevent self-tagging", async () => {
      await expect(
        tagUser({
          taggerFingerprintId: testTaggerId,
          targetFingerprintId: testTaggerId,
          tagType: testTagType,
        }),
      ).rejects.toThrow(new ApiError(400, ERROR_MESSAGES.CANNOT_TAG_SELF));
    });

    it("should prevent tagging a user who already has the tag", async () => {
      // First tag
      await tagUser({
        taggerFingerprintId: testTaggerId,
        targetFingerprintId: testTargetId,
        tagType: testTagType,
      });

      // Attempt to tag again
      await expect(
        tagUser({
          taggerFingerprintId: testTaggerId,
          targetFingerprintId: testTargetId,
          tagType: testTagType,
        }),
      ).rejects.toThrow(new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED));
    });

    it("should throw error for non-existent target", async () => {
      await expect(
        tagUser({
          taggerFingerprintId: testTaggerId,
          targetFingerprintId: nonExistentId,
          tagType: testTagType,
        }),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    });

    it("should throw error for non-existent tagger", async () => {
      await expect(
        tagUser({
          taggerFingerprintId: nonExistentId,
          targetFingerprintId: testTargetId,
          tagType: testTagType,
        }),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.TAGGER_NOT_FOUND));
    });

    it("should reject invalid tag types", async () => {
      await expect(
        tagUser({
          taggerFingerprintId: testTaggerId,
          targetFingerprintId: testTargetId,
          tagType: "invalid-tag",
        }),
      ).rejects.toThrow(new ApiError(400, ERROR_MESSAGES.INVALID_TAG_TYPE));
    });
  });

  describe("hasTag", () => {
    it("should return true for user with specific tag", async () => {
      await tagUser({
        taggerFingerprintId: testTaggerId,
        targetFingerprintId: testTargetId,
        tagType: testTagType,
      });
      const result = await hasTag({
        fingerprintId: testTargetId,
        tagType: testTagType,
      });
      expect(result).toBe(true);
    });

    it("should return false for user without specific tag", async () => {
      const result = await hasTag({
        fingerprintId: testTargetId,
        tagType: "nonexistent-tag",
      });
      expect(result).toBe(false);
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        hasTag({
          fingerprintId: nonExistentId,
          tagType: testTagType,
        }),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    });
  });

  describe("getUserTags", () => {
    it("should return active tags for a user", async () => {
      // Add tag
      await tagUser({
        taggerFingerprintId: testTaggerId,
        targetFingerprintId: testTargetId,
        tagType: testTagType,
      });

      const result = await getUserTags(testTargetId);
      expect(result.hasTags).toBe(true);
      expect(result.activeTags).toContain(testTagType);
      expect(result.activeTags).toHaveLength(1);
    });

    it("should return empty array for user with no tags", async () => {
      const result = await getUserTags(testTargetId);
      expect(result.hasTags).toBe(false);
      expect(result.activeTags).toHaveLength(0);
    });

    it("should throw error for non-existent user", async () => {
      await expect(getUserTags(nonExistentId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });

  describe("getTagHistory", () => {
    it("should return tag history from tag stats", async () => {
      await tagUser({
        taggerFingerprintId: testTaggerId,
        targetFingerprintId: testTargetId,
        tagType: testTagType,
      });
      const history = await getTagHistory(testTaggerId);

      expect(history.length).toBeGreaterThan(0);
      const lastTag = history[history.length - 1];
      expect(lastTag.type).toBe(testTagType);
      expect(lastTag.taggedBy).toBe(testTaggerId);
      expect(lastTag.taggedAt).toBeDefined();
    });

    it("should return empty array for user with no tag history", async () => {
      const history = await getTagHistory(testTargetId);
      expect(history).toEqual([]);
    });
  });

  describe("getTagLeaderboard", () => {
    it("should return daily leaderboard", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "daily",
        limit: 3,
        offset: 0,
        currentUserId: user2FingerprintId,
      });
      expect(result.timeFrame).toBe("daily");
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].fingerprintId).toBe(user2FingerprintId); // Most daily tags
      expect(result.entries[0].totalTags).toBe(15);
    });

    it("should return weekly leaderboard", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "weekly",
        limit: 3,
        offset: 0,
        currentUserId: user3FingerprintId,
      });
      expect(result.timeFrame).toBe("weekly");
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].fingerprintId).toBe(user3FingerprintId); // Most weekly tags
      expect(result.entries[0].totalTags).toBe(60);
    });

    it("should return monthly leaderboard", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "monthly",
        limit: 3,
        offset: 0,
        currentUserId: user1FingerprintId,
      });
      expect(result.timeFrame).toBe("monthly");
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].fingerprintId).toBe(user3FingerprintId); // Most monthly tags
      expect(result.entries[0].totalTags).toBe(100);
    });

    it("should return all-time leaderboard", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 3,
        offset: 0,
        currentUserId: user1FingerprintId,
      });
      expect(result.timeFrame).toBe("allTime");
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].fingerprintId).toBe(user3FingerprintId); // Most total tags
      expect(result.entries[0].totalTags).toBe(120);
    });

    it("should respect limit parameter", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 2,
        offset: 0,
        currentUserId: user1FingerprintId,
      });
      expect(result.entries).toHaveLength(2);
    });

    it("should respect offset parameter", async () => {
      // First verify the order without offset
      const fullResult = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 3,
        offset: 0,
        currentUserId: user1FingerprintId,
      });
      expect(fullResult.entries[0].fingerprintId).toBe(user3FingerprintId);
      expect(fullResult.entries[1].fingerprintId).toBe(user1FingerprintId);
      expect(fullResult.entries[2].fingerprintId).toBe(user2FingerprintId);

      // Then check with offset
      const result = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 2,
        offset: 1,
        currentUserId: user2FingerprintId,
      });
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].fingerprintId).toBe(user1FingerprintId); // Second highest total
      expect(result.entries[1].fingerprintId).toBe(user2FingerprintId); // Third highest total
    });

    it("should include user rank when requested", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 10,
        offset: 0,
        currentUserId: user2FingerprintId,
      });
      expect(result.userRank).toBe(3); // user2 has third most total tags (120 > 100 > 80)
    });

    it("should handle user not in leaderboard", async () => {
      const result = await getTagLeaderboard({
        timeFrame: "allTime",
        limit: 10,
        offset: 0,
        currentUserId: "nonexistent",
      });
      expect(result.userRank).toBeUndefined();
    });
  });
});
