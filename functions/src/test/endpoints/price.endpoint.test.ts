import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Price Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { apiKey } = await createTestData();
    validApiKey = apiKey;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Allow connections to close
  });

  describe("GET /price/current", () => {
    it("should allow public access", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/price/current`,
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });

    it("should handle invalid tokens", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/price/current?symbols=invalid-token`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
    });
  });

  describe("GET /price/history/:tokenId", () => {
    it("should return price history for a token", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/price/history/project89`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0]).toHaveProperty("price");
      expect(response.data.data[0]).toHaveProperty("createdAt");
    });

    it("should handle invalid token", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/price/history/invalid-token`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.TOKEN_NOT_FOUND);
    });
  });
});
