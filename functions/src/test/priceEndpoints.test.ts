import axios from "axios";
import { TEST_CONFIG, MOCK_PRICE_DATA } from "./testConfig";
import { createTestData } from "./testUtils";
import { describe, it, expect } from "@jest/globals";

describe("Price Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let apiKey: string;

  beforeEach(async () => {
    const testData = await createTestData();
    apiKey = testData.apiKey;
  });

  describe("GET /price/:tokenId", () => {
    it("should get price history for a token", async () => {
      const response = await axios.get(`${API_URL}/price/solana`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.prices)).toBe(true);
      if (response.data.prices.length > 0) {
        expect(response.data.prices[0]).toHaveProperty("timestamp");
        expect(response.data.prices[0]).toHaveProperty("price");
      }
    });

    it("should handle invalid token ID", async () => {
      await expect(
        axios.get(`${API_URL}/price/invalid-token`, {
          headers: {
            "x-api-key": apiKey,
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: expect.objectContaining({
            error: expect.stringContaining("Token not found"),
          }),
        },
      });
    });
  });

  describe("GET /prices", () => {
    it("should get current prices for multiple tokens", async () => {
      const response = await axios.get(`${API_URL}/prices`, {
        params: {
          symbols: ["solana", "project89"],
        },
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.prices).toHaveProperty("solana");
      expect(response.data.prices).toHaveProperty("project89");
      expect(response.data.prices.solana).toHaveProperty("usd");
      expect(response.data.prices.project89).toHaveProperty("usd");
      expect(response.data.prices.solana.usd).toBe(MOCK_PRICE_DATA.solana.usd);
      expect(response.data.prices.project89.usd).toBe(MOCK_PRICE_DATA.project89.usd);
    });

    it("should get prices for default tokens when no symbols provided", async () => {
      const response = await axios.get(`${API_URL}/prices`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Object.keys(response.data.prices).length).toBeGreaterThan(0);
      expect(response.data.prices.solana).toHaveProperty("usd");
      expect(response.data.prices.project89).toHaveProperty("usd");
      expect(typeof response.data.prices.solana.usd).toBe("number");
      expect(typeof response.data.prices.project89.usd).toBe("number");
    });
  });
});
