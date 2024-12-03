import axios from "axios";
import { TEST_CONFIG } from "./setup";
import { describe, it, expect } from "@jest/globals";

describe("Price Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("GET /price/:tokenId", () => {
    it("should get price history for a token", async () => {
      const response = await axios.get(`${API_URL}/price/solana`, {
        params: {
          timeframe: "24h",
          interval: "15m",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.prices)).toBe(true);
      expect(response.data.prices[0]).toHaveProperty("timestamp");
      expect(response.data.prices[0]).toHaveProperty("price");
    });

    it("should handle invalid token ID", async () => {
      try {
        await axios.get(`${API_URL}/price/invalid-token`);
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBeTruthy();
      }
    });
  });

  describe("GET /prices", () => {
    it("should get current prices for multiple tokens", async () => {
      const response = await axios.get(`${API_URL}/prices`, {
        params: {
          symbols: "solana,project89",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.prices).toHaveProperty("solana");
      expect(response.data.prices).toHaveProperty("project89");
    });

    it("should get prices for default tokens when no symbols provided", async () => {
      const response = await axios.get(`${API_URL}/prices`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Object.keys(response.data.prices).length).toBeGreaterThan(0);
    });
  });
});
