import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";

describe("API Key Endpoint", () => {
  let fingerprintId: string;
  let validApiKey: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /api-key/register", () => {
    it("should register a new API key", async () => {
      // Create a new fingerprint without an API key
      const registerResponse = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/fingerprint/register`,
        {
          fingerprint: "test-fingerprint-2",
          metadata: { test: true },
        },
      );
      const newFingerprintId = registerResponse.data.data.id;

      // Register an API key for the new fingerprint
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/register`,
        {
          fingerprintId: newFingerprintId,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data).toHaveProperty("fingerprintId", newFingerprintId);
    });

    it("should replace existing API key when registering a new one", async () => {
      // Store the original API key
      const originalApiKey = validApiKey;

      // Register a new API key for the same fingerprint
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/register`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": originalApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data.key).not.toBe(originalApiKey);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);

      // Verify the original API key is no longer valid
      const validateResponse = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/validate`,
        {
          key: originalApiKey,
        },
        {
          headers: {
            "x-api-key": response.data.data.key,
          },
        },
      );

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.success).toBe(true);
      expect(validateResponse.data.data).toHaveProperty("isValid", false);
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/register`,
        {},
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["fingerprintId"],
          message: "Required",
        },
      ]);
    });

    it("should validate fingerprintId exists", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/register`,
        {
          fingerprintId: "non-existent-id",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });

  describe("POST /api-key/validate", () => {
    it("should validate a valid API key", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/validate`,
        {
          key: validApiKey,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
    });

    it("should reject an invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/validate`,
        {
          key: "invalid-key",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", false);
      expect(response.data.data).not.toHaveProperty("fingerprintId");
    });

    it("should require key field", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/validate`,
        {},
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["key"],
          message: "Required",
        },
      ]);
    });
  });

  describe("POST /api-key/revoke", () => {
    it("should revoke an existing API key", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        {
          key: validApiKey,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("API key revoked successfully");

      // Verify the key is no longer valid
      const validateResponse = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/validate`,
        {
          key: validApiKey,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.success).toBe(true);
      expect(validateResponse.data.data).toHaveProperty("isValid", false);
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest("post", `${TEST_CONFIG.apiUrl}/api-key/revoke`, {
        key: validApiKey,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        {
          key: validApiKey,
        },
        {
          headers: {
            "x-api-key": "invalid-key",
          },
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/api-key/revoke`,
        {
          key: validApiKey,
        },
        {
          headers: {
            "x-api-key": otherApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Not authorized to revoke this API key");
    });
  });
});
