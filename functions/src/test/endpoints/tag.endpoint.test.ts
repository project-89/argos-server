import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Tag Game Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let user1ApiKey: string;
  let user1FingerprintId: string;
  let user2ApiKey: string;
  let user2FingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create two test users
    const user1Data = await createTestData({
      metadata: {
        name: "User 1",
        test: true,
      },
      skipCleanup: true,
    });
    user1ApiKey = user1Data.apiKey;
    user1FingerprintId = user1Data.fingerprintId;

    const user2Data = await createTestData({
      metadata: {
        name: "User 2",
        test: true,
      },
      skipCleanup: true,
    });
    user2ApiKey = user2Data.apiKey;
    user2FingerprintId = user2Data.fingerprintId;

    // Wait for a short time to ensure all database operations are complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("POST /tag", () => {
    it("should successfully tag another user as 'it'", async () => {
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
      expect(response.data.data.message).toBe("Successfully tagged user as 'it'");
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
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.CANNOT_TAG_SELF);
    });

    it("should prevent tagging a user who is already it", async () => {
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
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });
  });

  describe("GET /tag/is-it/:fingerprintId", () => {
    it("should return true for tagged user", async () => {
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

      // Check if they're it
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/is-it/${user2FingerprintId}`,
        headers: {
          "x-api-key": user2ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.isIt).toBe(true);
    });

    it("should return false for untagged user", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/is-it/${user1FingerprintId}`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.isIt).toBe(false);
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
        url: `${API_URL}/tag/history/${user2FingerprintId}`,
        headers: {
          "x-api-key": user2ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toHaveLength(1);
      expect(response.data.data.tags[0].tag).toBe("it");
      expect(response.data.data.tags[0].taggedBy).toBe(user1FingerprintId);
      expect(response.data.data.tags[0].taggedAt).toBeDefined();
    });

    it("should return empty array for user with no tags", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/tag/history/${user1FingerprintId}`,
        headers: {
          "x-api-key": user1ApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual([]);
    });
  });
});
