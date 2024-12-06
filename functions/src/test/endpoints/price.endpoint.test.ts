import { describe, it, expect } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";

describe("Price Endpoint", () => {
  describe("GET /price/current", () => {
    it("should return current prices for default tokens", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data).toHaveProperty("solana");
      expect(response.data.data).toHaveProperty("bitcoin");
      expect(response.data.data.solana).toHaveProperty("usd");
      expect(response.data.data.solana).toHaveProperty("usd_24h_change");
      expect(response.data.data.bitcoin).toHaveProperty("usd");
      expect(response.data.data.bitcoin).toHaveProperty("usd_24h_change");
    });

    it("should return prices for specified tokens", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`, {
        params: {
          symbols: ["solana", "bitcoin"],
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data).toHaveProperty("solana");
      expect(response.data.data).toHaveProperty("bitcoin");
      expect(response.data.data.solana).toHaveProperty("usd");
      expect(response.data.data.solana).toHaveProperty("usd_24h_change");
      expect(response.data.data.bitcoin).toHaveProperty("usd");
      expect(response.data.data.bitcoin).toHaveProperty("usd_24h_change");
    });

    it("should handle errors gracefully", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`, {
        params: {
          symbols: ["invalid_token"],
        },
      });

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("No price data found for invalid_token");
    });
  });

  describe("GET /price/history/:tokenId", () => {
    it("should return price history for a token", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/history/solana`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0]).toHaveProperty("timestamp");
      expect(response.data.data[0]).toHaveProperty("price");
    });

    it("should handle missing tokenId", async () => {
      try {
        await axios.get(`${TEST_CONFIG.apiUrl}/price/history/`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toBe("Cannot GET /price/history/");
      }
    });

    it("should handle invalid token", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/history/invalid_token`);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Token not found");
    });
  });
});
