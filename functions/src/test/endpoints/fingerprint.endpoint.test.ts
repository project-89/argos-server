import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";
import { COLLECTIONS } from "../../constants";
import * as admin from "firebase-admin";

describe("Fingerprint Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;
  let fingerprintValue: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey, fingerprint } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
    fingerprintValue = fingerprint;
  });

  describe("POST /fingerprint/register", () => {
    it("should register a new fingerprint with IP metadata", async () => {
      const testIp = "127.0.0.1";
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          fingerprint: "test-fingerprint-2",
          metadata: { test: true },
        },
        {
          headers: {
            "x-forwarded-for": testIp,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint-2");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
      expect(response.data.data).toHaveProperty("tags", []);

      // Verify IP tracking data
      expect(response.data.data).toHaveProperty("ipAddresses");
      expect(Array.isArray(response.data.data.ipAddresses)).toBe(true);
      expect(response.data.data.ipAddresses).toContain(testIp);

      expect(response.data.data).toHaveProperty("ipMetadata");
      expect(response.data.data.ipMetadata).toHaveProperty("primaryIp", testIp);
      expect(response.data.data.ipMetadata.ipFrequency[testIp]).toBe(1);
      expect(response.data.data.ipMetadata).toHaveProperty("lastSeenAt");
      expect(response.data.data.ipMetadata.suspiciousIps).toEqual([]);
    });

    it("should track IP frequency and update primary IP", async () => {
      const testIp = "127.0.0.1";
      // First request with initial IP
      const response1 = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          fingerprint: "test-fingerprint-3",
          metadata: { test: true },
        },
        {
          headers: {
            "x-forwarded-for": testIp,
          },
        },
      );

      expect(response1.status).toBe(200);
      expect(response1.data.data).toHaveProperty("ipAddresses");
      expect(response1.data.data.ipAddresses).toContain(testIp);

      const fingerprintId = response1.data.data.id;

      // Create an API key for this fingerprint
      const apiKeyResponse = await makeRequest("post", `${API_URL}/api-key/register`, {
        fingerprintId,
      });
      const apiKey = apiKeyResponse.data.data.key;

      // Make multiple requests with the first IP to establish it as primary
      for (let i = 0; i < 15; i++) {
        await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
          headers: {
            "x-api-key": apiKey,
            "x-forwarded-for": testIp,
          },
        });
      }

      // Verify the first IP is now primary
      const response2 = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: {
          "x-api-key": apiKey,
          "x-forwarded-for": testIp,
        },
      });

      expect(response2.data.data.ipMetadata.primaryIp).toBe(testIp);
      expect(response2.data.data.ipMetadata.ipFrequency[testIp]).toBe(17); // Initial + 16 requests

      // Wait for the initial time window to pass
      await new Promise((resolve) => setTimeout(resolve, 150)); // Wait longer than the test time window (100ms)

      // Make request with a new IP
      const newIp = "1.2.3.4";
      const response3 = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: {
          "x-api-key": apiKey,
          "x-forwarded-for": newIp,
        },
      });

      // Verify the new IP is tracked and marked as suspicious
      expect(response3.data.message).toBe("Suspicious IP activity detected");
      expect(response3.data.data.ipMetadata.suspiciousIps).toContain(newIp);
      expect(response3.data.data.ipMetadata.primaryIp).toBe(testIp); // First IP should still be primary
    });

    it("should not mark new IPs as suspicious within initial time window", async () => {
      const testIp = "127.0.0.1";
      // Register a new fingerprint
      const response1 = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          fingerprint: "test-fingerprint-4",
          metadata: { test: true },
        },
        {
          headers: {
            "x-forwarded-for": testIp,
          },
        },
      );

      const fingerprintId = response1.data.data.id;

      // Create an API key
      const apiKeyResponse = await makeRequest("post", `${API_URL}/api-key/register`, {
        fingerprintId,
      });
      const apiKey = apiKeyResponse.data.data.key;

      // Make request with a different IP within the time window
      const newIp = "5.6.7.8";
      const response2 = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: {
          "x-api-key": apiKey,
          "x-forwarded-for": newIp,
        },
      });

      // Verify the new IP is not marked as suspicious
      expect(response2.data).not.toHaveProperty("warning");
      expect(response2.data.data.ipMetadata.suspiciousIps).not.toContain(newIp);
    });

    it("should require fingerprint field", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {},
        {
          validateStatus: () => true,
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
          path: ["fingerprint"],
          message: "Required",
        },
      ]);
    });
  });

  describe("GET /fingerprint/:id", () => {
    it("should get fingerprint by ID", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", fingerprintId);
      expect(response.data.data).toHaveProperty("fingerprint", fingerprintValue);
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("testData", true);
      expect(response.data.data).toHaveProperty("tags", []);
      if (response.data.data.tags) {
        expect(typeof response.data.data.tags).toBe("object");
      }
    });

    it("should handle non-existent fingerprint", async () => {
      // Create a new fingerprint
      const newFingerprintResponse = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint-for-404",
        metadata: { test: true },
      });
      const newFingerprintId = newFingerprintResponse.data.data.id;

      // Create an API key for the new fingerprint
      const newApiKeyResponse = await makeRequest("post", `${API_URL}/api-key/register`, {
        fingerprintId: newFingerprintId,
      });
      const newApiKey = newApiKeyResponse.data.data.key;

      // Delete the fingerprint directly from the database
      const db = admin.firestore();
      await db.collection(COLLECTIONS.FINGERPRINTS).doc(newFingerprintId).delete();

      // Try to access the deleted fingerprint with its API key
      const response = await makeRequest(
        "get",
        `${API_URL}/fingerprint/${newFingerprintId}`,
        null,
        {
          headers: { "x-api-key": newApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should handle missing ID parameter", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/`, null, {
        validateStatus: () => true,
        headers: {
          "x-api-key": validApiKey,
          Accept: "application/json",
        },
      });

      expect(response.status).toBe(404);
      expect(response.data).toEqual({
        success: false,
        error: "Not Found",
        message: "The requested endpoint does not exist",
      });
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: { "x-api-key": "invalid-key" },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different fingerprint value
      const otherFingerprintResponse = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          fingerprint: "completely-different-fingerprint",
          metadata: { test: true },
        },
      );
      const otherFingerprintId = otherFingerprintResponse.data.data.id;

      // Create API key for the other fingerprint
      const otherApiKeyResponse = await makeRequest("post", `${API_URL}/api-key/register`, {
        fingerprintId: otherFingerprintId,
      });
      const otherApiKey = otherApiKeyResponse.data.data.key;

      // Try to access the first fingerprint using the second fingerprint's API key
      const response = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`, null, {
        headers: { "x-api-key": otherApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });
});
