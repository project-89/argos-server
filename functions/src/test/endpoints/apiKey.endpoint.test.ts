import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("API Key Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  beforeEach(async () => {
    // Clean up any existing API keys
    const db = getFirestore();
    const apiKeysRef = db.collection(COLLECTIONS.API_KEYS);
    const snapshot = await apiKeysRef.where("fingerprintId", "==", testFingerprint.id).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  describe("POST /apiKey/register", () => {
    it("should register a new API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/apiKey/register`,
        {},
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprintId");
    });

    it("should validate fingerprintId exists", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/apiKey/register`,
        {
          fingerprintId: "non-existent-id",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });

  describe("POST /apiKey/validate", () => {
    let validApiKey: string;

    beforeEach(async () => {
      // Register a valid API key for validation tests
      const registerResponse = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });
      validApiKey = registerResponse.data.data.key;
    });

    it("should validate a valid API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/validate`, {
        key: validApiKey,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
    });

    it("should reject an invalid API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/validate`, {
        key: "invalid-key",
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", false);
      expect(response.data.data).not.toHaveProperty("fingerprintId");
    });

    it("should require key field", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/apiKey/validate`,
        {},
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });

  describe("POST /apiKey/revoke", () => {
    let apiKeyToRevoke: string;

    beforeEach(async () => {
      // Register an API key for revocation tests
      const registerResponse = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });
      apiKeyToRevoke = registerResponse.data.data.key;
    });

    it("should revoke an existing API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/revoke`, {
        key: apiKeyToRevoke,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("message", "API key revoked successfully");

      // Verify the key is no longer valid
      const validateResponse = await makeRequest("post", `${API_URL}/apiKey/validate`, {
        key: apiKeyToRevoke,
      });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.success).toBe(true);
      expect(validateResponse.data.data).toHaveProperty("isValid", false);
    });

    it("should handle non-existent API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/apiKey/revoke`,
        {
          key: "non-existent-key",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key not found");
    });

    it("should require key field", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/apiKey/revoke`,
        {},
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });
});
