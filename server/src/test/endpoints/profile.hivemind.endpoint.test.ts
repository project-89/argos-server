import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants";

describe("Profile Endpoints", () => {
  let fingerprintId: string;
  let validApiKey: string;

  beforeEach(async () => {
    await cleanDatabase();
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    validApiKey = testData.apiKey;
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  describe("createProfile", () => {
    it("should create a profile successfully", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: expect.any(String),
        fingerprintId,
        username: "testuser",
        walletAddress: "0x1234567890123456789012345678901234567890",
        preferences: expect.any(Object),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should not allow duplicate usernames", async () => {
      // Create first profile
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });

      // Try to create second profile with same username
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x9876543210987654321098765432109876543210",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.USERNAME_TAKEN);
    });
  });

  describe("getProfile", () => {
    it("should get a profile by ID", async () => {
      // Create a profile first
      const createResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });
      const profileId = createResponse.data.data.id;

      // Get the profile
      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: profileId,
        fingerprintId,
        username: "testuser",
        walletAddress: "0x1234567890123456789012345678901234567890",
        preferences: expect.any(Object),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should get a profile by wallet address", async () => {
      const walletAddress = "0x1234567890123456789012345678901234567890";
      // Create a profile first
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress,
        },
      });

      // Get the profile by wallet
      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/wallet/${walletAddress}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: expect.any(String),
        fingerprintId,
        username: "testuser",
        walletAddress,
        preferences: expect.any(Object),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should return 404 for non-existent profile", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/non-existent-id`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    });
  });

  describe("updateProfile", () => {
    it("should update a profile successfully", async () => {
      // Create a profile first
      const createResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });
      const profileId = createResponse.data.data.id;

      // Update the profile
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          username: "updateduser",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: profileId,
        fingerprintId,
        username: "updateduser",
        walletAddress: "0x1234567890123456789012345678901234567890",
        preferences: {
          theme: "dark",
          notifications: true,
        },
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should allow partial updates", async () => {
      // Create a profile first
      const createResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "testuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });
      const profileId = createResponse.data.data.id;

      // Update only the username
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          username: "newname",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        id: profileId,
        fingerprintId,
        username: "newname",
        walletAddress: "0x1234567890123456789012345678901234567890",
        preferences: expect.any(Object),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it("should not allow updating to an existing username", async () => {
      // Create first profile
      const firstProfile = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "firstuser",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
      });

      // Create second profile
      const secondProfile = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
        headers: { "x-api-key": validApiKey },
        data: {
          fingerprintId,
          username: "seconduser",
          walletAddress: "0x9876543210987654321098765432109876543210",
        },
      });

      // Try to update second profile to use first profile's username
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${secondProfile.data.data.id}`,
        headers: { "x-api-key": validApiKey },
        data: {
          username: "firstuser",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.USERNAME_TAKEN);
    });
  });
});
