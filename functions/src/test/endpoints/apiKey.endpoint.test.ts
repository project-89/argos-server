import { describe, it, expect } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";

describe("API Key Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("POST /apiKey/register", () => {
    it("should register a new API key", async () => {
      const response = await axios.post(`${API_URL}/apiKey/register`, {
        fingerprintId: TEST_CONFIG.testFingerprint.id,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("key");
      expect(response.data.data).toHaveProperty("fingerprintId", TEST_CONFIG.testFingerprint.id);
    });

    it("should require fingerprintId", async () => {
      const response = await axios.post(`${API_URL}/apiKey/register`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprintId");
    });

    it("should validate fingerprintId exists", async () => {
      const response = await axios.post(`${API_URL}/apiKey/register`, {
        fingerprintId: "non-existent-id",
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });

  describe("POST /apiKey/validate", () => {
    it("should validate a valid API key", async () => {
      // First register a new key
      const registerResponse = await axios.post(`${API_URL}/apiKey/register`, {
        fingerprintId: TEST_CONFIG.testFingerprint.id,
      });
      const apiKey = registerResponse.data.data.key;

      // Then validate it
      const response = await axios.post(`${API_URL}/apiKey/validate`, {
        key: apiKey,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", true);
      expect(response.data.data).toHaveProperty("fingerprintId", TEST_CONFIG.testFingerprint.id);
    });

    it("should reject an invalid API key", async () => {
      const response = await axios.post(`${API_URL}/apiKey/validate`, {
        key: "invalid-key",
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("isValid", false);
    });

    it("should require key field", async () => {
      const response = await axios.post(`${API_URL}/apiKey/validate`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });

  describe("POST /apiKey/revoke", () => {
    it("should revoke an existing API key", async () => {
      // First register a new key
      const registerResponse = await axios.post(`${API_URL}/apiKey/register`, {
        fingerprintId: TEST_CONFIG.testFingerprint.id,
      });
      const apiKey = registerResponse.data.data.key;

      // Then revoke it
      const response = await axios.post(`${API_URL}/apiKey/revoke`, {
        key: apiKey,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify key is no longer valid
      const validateResponse = await axios.post(`${API_URL}/apiKey/validate`, {
        key: apiKey,
      });
      expect(validateResponse.data.data.isValid).toBe(false);
    });

    it("should handle non-existent API key", async () => {
      const response = await axios.post(`${API_URL}/apiKey/revoke`, {
        key: "non-existent-key",
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key not found");
    });

    it("should require key field", async () => {
      const response = await axios.post(`${API_URL}/apiKey/revoke`, {});

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: key");
    });
  });
});
