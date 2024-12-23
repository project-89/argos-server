import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";

describe("Price Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { apiKey } = await createTestData();
    validApiKey = apiKey;
  });

  describe("GET /price/current", () => {
    it("should allow public access", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current`, null, {
        headers: { "x-api-key": undefined },
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });

    it("should return current prices for default tokens", async () => {
      const response = await makeRequest("get", `${API_URL}/price/current`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Object.keys(response.data.data).length).toBeGreaterThan(0);
    });

    it("should return prices for specified tokens", async () => {
      const response = await makeRequest(
        "get",
        `${API_URL}/price/current?symbols=Project89`,
        null,
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.Project89).toBeDefined();
      expect(response.data.data.Project89.usd).toBeDefined();
      expect(response.data.data.Project89.usd_24h_change).toBeDefined();
    });

    it("should handle invalid tokens", async () => {
      const response = await makeRequest(
        "get",
        `${API_URL}/price/current?symbols=invalid-token`,
        null,
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("No price data found for invalid-token");
    });
  });

  describe("GET /price/history/:tokenId", () => {
    it("should allow public access", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/Project89`, null, {
        headers: { "x-api-key": undefined },
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it("should return price history for a token", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/Project89`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0]).toHaveProperty("timestamp");
      expect(response.data.data[0]).toHaveProperty("price");
    });

    it("should handle missing tokenId", async () => {
      // Test both with and without trailing slash
      const responses = await Promise.all([
        makeRequest("get", `${API_URL}/price/history/`, {
          validateStatus: () => true,
        }),
        makeRequest("get", `${API_URL}/price/history`, {
          validateStatus: () => true,
        }),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(404);
        expect(response.data.success).toBe(false);
        expect(response.data.error).toBe("Not Found");
      });
    });

    it("should handle invalid token", async () => {
      const response = await makeRequest("get", `${API_URL}/price/history/invalid-token`, null, {
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Token not found");
    });
  });
});
