import { describe, it, expect } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";

describe("Fingerprint Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("POST /fingerprint/register", () => {
    it("should register a new fingerprint", async () => {
      const response = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
    });

    it("should require fingerprint field", async () => {
      const response = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        metadata: { test: true },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprint");
    });
  });

  describe("GET /fingerprint/:id", () => {
    it("should get fingerprint by ID", async () => {
      // First register a fingerprint
      const registerResponse = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });

      const fingerprintId = registerResponse.data.data.id;

      const response = await makeRequest("get", `${API_URL}/fingerprint/${fingerprintId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", fingerprintId);
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/non-existent-id`);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should handle missing ID parameter", async () => {
      try {
        await makeRequest("get", `${API_URL}/fingerprint/`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toBe("Cannot GET /fingerprint/");
      }
    });
  });
});
