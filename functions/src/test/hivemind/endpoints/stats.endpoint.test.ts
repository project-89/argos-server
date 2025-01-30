import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../../utils/testUtils";
import { ERROR_MESSAGES } from "../../../constants/api";

describe("Stats Endpoints", () => {
  let fingerprintId: string;
  let validApiKey: string;
  let profileId: string;

  beforeEach(async () => {
    await cleanDatabase();
    // Create fingerprint and get API key
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    validApiKey = testData.apiKey;

    // Create a profile linked to the fingerprint
    const profileResponse = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
      headers: { "x-api-key": validApiKey },
      data: {
        fingerprintId,
        username: "testuser",
        walletAddress: "0x1234567890123456789012345678901234567890",
      },
    });
    profileId = profileResponse.data.data.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  describe("updateStats", () => {
    it("should update stats successfully", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/stats/${profileId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          missionsCompleted: 5,
          successRate: 80,
          totalRewards: 100,
          reputation: 50,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: profileId,
        missionsCompleted: 5,
        successRate: 80,
        totalRewards: 100,
        reputation: 50,
        joinedAt: expect.any(Number),
        lastActive: expect.any(Number),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should allow partial updates", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/stats/${profileId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          missionsCompleted: 3,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: profileId,
        missionsCompleted: 3,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
        joinedAt: expect.any(Number),
        lastActive: expect.any(Number),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should validate success rate range", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/stats/${profileId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          successRate: 101,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Success rate must be between 0 and 100");
    });

    it("should return 404 for non-existent profile", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/stats/non-existent-id`,
        headers: { "x-api-key": validApiKey },
        data: {
          missionsCompleted: 1,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.STATS_NOT_FOUND);
    });
  });
});
