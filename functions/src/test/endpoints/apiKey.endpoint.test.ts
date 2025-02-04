import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../config/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants";

describe("API Key Endpoint", () => {
  let fingerprintId: string;
  let validApiKey: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /api-key/register", () => {
    it("should register a new API key", async () => {
      // Create a new fingerprint without an API key
      const registerResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/fingerprint/register`,
        data: {
          fingerprint: "test-fingerprint-2",
          metadata: { test: true },
        },
      });
      const newFingerprintId = registerResponse.data.data.id;

      // Register an API key for the new fingerprint
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/register`,
        data: {
          fingerprintId: newFingerprintId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data).toHaveProperty("fingerprintId", newFingerprintId);

      // Verify the new key works by using it in a request
      const verifyResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/register`,
        data: {
          fingerprintId: newFingerprintId,
        },
      });
      expect(verifyResponse.status).toBe(200);
    });

    it("should replace existing API key when registering a new one", async () => {
      // Store the original API key
      const originalApiKey = validApiKey;

      // Register a new API key for the same fingerprint
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/register`,
        data: {
          fingerprintId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data.key).not.toBe(originalApiKey);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);

      // Verify the original API key is no longer valid by trying to use it
      const verifyResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {
          key: originalApiKey,
        },
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.success).toBe(true);
      expect(verifyResponse.data.data).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/register`,
        data: {},
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["body", "fingerprintId"],
          message: ERROR_MESSAGES.MISSING_FINGERPRINT,
        },
      ]);
    });

    it("should validate fingerprintId exists", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/register`,
        data: {
          fingerprintId: "non-existent-id",
        },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    });
  });

  describe("POST /api-key/revoke", () => {
    it("should revoke an existing API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        data: {
          key: validApiKey,
        },
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("API key revoked successfully");

      // Verify the key is no longer valid by trying to use it
      const verifyResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {
          key: validApiKey,
        },
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.success).toBe(true);
      expect(verifyResponse.data.data).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        data: {
          key: validApiKey,
        },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        data: {
          key: validApiKey,
        },
        headers: {
          "x-api-key": "invalid-key",
        },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        data: {
          key: validApiKey,
        },
        headers: {
          "x-api-key": otherApiKey,
        },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
    });
  });

  describe("POST /api-key/validate", () => {
    it("should validate a valid API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {
          key: validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        isValid: true,
        needsRefresh: false,
      });
    });

    it("should indicate when a key needs refresh", async () => {
      // Revoke the key first
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        data: {
          key: validApiKey,
        },
        headers: {
          "x-api-key": validApiKey,
        },
      });

      // Then validate it
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {
          key: validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });

    it("should indicate when a key does not exist", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {
          key: "non-existent-key",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });

    it("should require key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/api-key/validate`,
        data: {},
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["body", "key"],
          message: ERROR_MESSAGES.MISSING_API_KEY,
        },
      ]);
    });
  });
});

// Global cleanup
afterAll((done) => {
  // Clean up database and destroy agent
  cleanDatabase()
    .then(() => {
      destroyAgent();
      done();
    })
    .catch((error) => {
      console.error("Failed to clean up:", error);
      done(error);
    });
});
