import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";

describe("Tag Game Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let user1ApiKey: string;
  let user1FingerprintId: string;
  let user2ApiKey: string;
  let user2FingerprintId: string;
  const testTagType = "it";

  beforeEach(async () => {
    await cleanDatabase();

    // Create two test users
    const testUser1 = await createTestData({
      metadata: {
        name: "User 1",
        test: true,
      },
      skipCleanup: true,
      initialTags: {
        it: { type: "it", taggedBy: "initial", taggedAt: new Date() },
      },
    });
    user1ApiKey = testUser1.apiKey;
    user1FingerprintId = testUser1.fingerprintId;

    const user2Data = await createTestData({
      metadata: {
        name: "User 2",
        test: true,
      },
      skipCleanup: true,
    });
    user2ApiKey = user2Data.apiKey;
    user2FingerprintId = user2Data.fingerprintId;

    // Verify user1 has the "it" tag
    const db = getFirestore();
    const user1Doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(user1FingerprintId).get();
    const user1DocData = user1Doc.data();
    if (!user1DocData?.tags?.it) {
      throw new Error("Test setup failed: User1 does not have the 'it' tag");
    }

    // Wait for a short time to ensure all database operations are complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("POST /tag", () => {
    it("should successfully tag another user with a specific tag", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user2FingerprintId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.success).toBe(true);
      expect(response.data.data.message).toBe(`Successfully tagged user with ${testTagType}`);
    });

    it("should prevent self-tagging", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user1FingerprintId,
          tagType: testTagType,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.CANNOT_TAG_SELF);
    });

    it("should prevent tagging a user who already has the tag", async () => {
      // First tag
      await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user2FingerprintId,
        },
      });

      // Try to tag again
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user2FingerprintId,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.ALREADY_TAGGED);
    });

    it("should require authentication", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        data: {
          targetFingerprintId: user2FingerprintId,
          tagType: testTagType,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });
  });

  describe("GET /tag/user/:fingerprintId", () => {
    it("should return active tags for user", async () => {
      // First tag the user
      await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user2FingerprintId,
        },
      });

      // Get tags
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/user/${user2FingerprintId}`,
        headers: {
          "x-api-key": user2ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.hasTags).toBe(true);
      expect(response.data.data.activeTags).toContain(testTagType);
      expect(response.data.data.activeTags).toHaveLength(1);
    });
  });

  describe("GET /tag/history/:fingerprintId", () => {
    it("should return tag history for user", async () => {
      // First tag the user
      await makeRequest({
        method: "post",
        url: `${API_URL}/tag`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        data: {
          targetFingerprintId: user2FingerprintId,
        },
      });

      // Get history
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/history/${user1FingerprintId}`, // Check tagger's history
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toHaveLength(1);
      expect(response.data.data.tags[0].type).toBe(testTagType);
      expect(response.data.data.tags[0].taggedBy).toBe(user1FingerprintId);
      expect(response.data.data.tags[0].taggedAt).toBeDefined();
    });
  });

  describe("GET /tag/leaderboard", () => {
    beforeEach(async () => {
      const db = getFirestore();
      const now = new Date();

      // Create test tag stats for multiple users
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
      ];

      // Add test stats to database
      for (const stat of testStats) {
        await db.collection(COLLECTIONS.TAG_STATS).doc(stat.id).set(stat);
      }
    });

    it("should return daily leaderboard", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=daily`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.timeframe).toBe("daily");
      expect(response.data.data.entries).toHaveLength(2);
      expect(response.data.data.entries[0].fingerprintId).toBe(user2FingerprintId); // Most daily tags
      expect(response.data.data.entries[0].totalTags).toBe(15);
    });

    it("should return weekly leaderboard", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=weekly`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.timeframe).toBe("weekly");
      expect(response.data.data.entries).toHaveLength(2);
      expect(response.data.data.entries[0].fingerprintId).toBe(user1FingerprintId); // Most weekly tags
      expect(response.data.data.entries[0].totalTags).toBe(50);
    });

    it("should return monthly leaderboard", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=monthly`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.timeframe).toBe("monthly");
      expect(response.data.data.entries).toHaveLength(2);
      expect(response.data.data.entries[0].fingerprintId).toBe(user1FingerprintId); // Most monthly tags
      expect(response.data.data.entries[0].totalTags).toBe(80);
    });

    it("should return all-time leaderboard", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=allTime`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.timeframe).toBe("allTime");
      expect(response.data.data.entries).toHaveLength(2);
      expect(response.data.data.entries[0].fingerprintId).toBe(user1FingerprintId); // Most total tags
      expect(response.data.data.entries[0].totalTags).toBe(100);
    });

    it("should respect limit parameter", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=allTime&limit=1`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.entries).toHaveLength(1);
    });

    it("should respect offset parameter", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=allTime&offset=1`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.entries).toHaveLength(1);
      expect(response.data.data.entries[0].fingerprintId).toBe(user2FingerprintId); // Second highest total
    });

    it("should include user rank when requested", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=allTime&fingerprintId=${user2FingerprintId}`,
        headers: {
          "x-api-key": user2ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.userRank).toBe(2); // user2 has second most total tags
    });

    it("should handle user not in leaderboard", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=allTime&fingerprintId=nonexistent`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.userRank).toBeUndefined();
    });

    it("should require valid timeframe", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=invalid`,
        headers: {
          "x-api-key": user1ApiKey,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it("should require authentication", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/leaderboard?timeframe=daily`,
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });
  });
});
