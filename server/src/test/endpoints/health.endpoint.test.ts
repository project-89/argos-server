import { describe, it, expect } from "@jest/globals";
import { makeRequest } from "../utils/testUtils";
import { TEST_CONFIG } from "../config/testConfig";

describe("Health Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/health`,
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual(
        expect.objectContaining({
          status: "healthy",
          timestamp: expect.any(String),
          version: expect.any(String),
        }),
      );

      // Verify timestamp is a valid ISO string
      expect(new Date(response.data.data.timestamp).getTime()).not.toBeNaN();
    });
  });
});
