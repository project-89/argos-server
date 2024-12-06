import { describe, it, expect } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";

describe("Price Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("GET /price/current", () => {
    it("should require API key", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current`, null, {
        headers: { "x-api-key": undefined }, // Explicitly remove API key
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should return current prices for default tokens", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Object.keys(response.data.data).length).toBeGreaterThan(0);
    });

    it("should return prices for specified tokens", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current?symbols=Project89`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.Project89).toBeDefined();
      expect(response.data.data.Project89.usd).toBeDefined();
      expect(response.data.data.Project89.usd_24h_change).toBeDefined();
    });

    it("should handle errors gracefully", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current?symbols=invalid-token`);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("No price data found for invalid-token");
    });
  });

  describe("GET /price/history/:tokenId", () => {
    it("should require API key", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/Project89`, null, {
        headers: { "x-api-key": undefined }, // Explicitly remove API key
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should return price history for a token", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/Project89`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0]).toHaveProperty("timestamp");
      expect(response.data.data[0]).toHaveProperty("price");
    });

    it("should handle missing tokenId", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/`);

      expect(response.status).toBe(404);
    });

    it("should handle invalid token", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/invalid-token`);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("No price data found for invalid-token");
    });
  });
});
