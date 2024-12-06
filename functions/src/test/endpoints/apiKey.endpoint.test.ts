import { describe, it, expect } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";

describe("API Key Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  describe("POST /apiKey/register", () => {
    it("should register a new API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("enabled", true);
      expect(response.data.data).toHaveProperty("usageCount", 0);
      expect(response.data.data).toHaveProperty("endpointStats");
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/register`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprintId");
    });

    it("should validate fingerprintId exists", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: "non-existent-id",
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });

  describe("POST /apiKey/validate", () => {
    it("should validate a valid API key", async () => {
      // First register an API key
      const registerResponse = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });

      const apiKey = registerResponse.data.data.key;

      const response = await makeRequest("post", `${API_URL}/apiKey/validate`, {
        key: apiKey,
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
      const response = await makeRequest("post", `${API_URL}/apiKey/validate`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });

  describe("POST /apiKey/revoke", () => {
    it("should revoke an existing API key", async () => {
      // First register an API key
      const registerResponse = await makeRequest("post", `${API_URL}/apiKey/register`, {
        fingerprintId: testFingerprint.id,
      });

      const apiKey = registerResponse.data.data.key;

      // Then revoke it
      const response = await makeRequest("post", `${API_URL}/apiKey/revoke`, {
        key: apiKey,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key", apiKey);
      expect(response.data.data).toHaveProperty("enabled", false);

      // Verify the key is no longer valid
      const validateResponse = await makeRequest("post", `${API_URL}/apiKey/validate`, {
        key: apiKey,
      });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.success).toBe(true);
      expect(validateResponse.data.data).toHaveProperty("isValid", false);
    });

    it("should handle non-existent API key", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/revoke`, {
        key: "non-existent-key",
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key not found");
    });

    it("should require key field", async () => {
      const response = await makeRequest("post", `${API_URL}/apiKey/revoke`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });
});
