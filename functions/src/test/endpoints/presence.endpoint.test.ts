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

describe("Presence Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /visit/presence", () => {
    it("should update presence status", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("status", "online");
      expect(response.data.data).toHaveProperty("timestamp");
    });

    it("should require fingerprintId and status", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          // missing status
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: status");
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": "invalid-key" },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      // Try to update presence for the first fingerprint using the second fingerprint's API key
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });

    it("should handle non-existent fingerprint", async () => {
      // Create a new fingerprint and get its API key
      const { fingerprintId: newFingerprintId, apiKey: newApiKey } = await createTestData();

      // Delete the fingerprint but keep its API key
      const db = admin.firestore();
      await db.collection(COLLECTIONS.FINGERPRINTS).doc(newFingerprintId).delete();

      // Try to update presence for the deleted fingerprint
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId: newFingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": newApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });
});
