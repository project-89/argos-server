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
    it("should register a new fingerprint", async () => {
      const response = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint-2",
        metadata: { test: true },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint-2");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
      expect(response.data.data).toHaveProperty("tags", {});
    });

    it("should require fingerprint field", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          metadata: { test: true },
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprint");
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
      expect(response.data.data).toHaveProperty("tags", {});
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
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data).toMatch(/Cannot GET \/fingerprint\//);
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
