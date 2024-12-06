import { describe, it, expect, beforeAll } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { configureAxios } from "../utils/testUtils";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.FUNCTIONS_EMULATOR = "true";

describe("Price Endpoint", () => {
  beforeAll(() => {
    configureAxios();
    // Add test headers
    axios.defaults.headers.common = {
      ...axios.defaults.headers.common,
      ...TEST_CONFIG.testHeaders,
      "x-test-env": "true",
      "Content-Type": "application/json",
    };
  });

  describe("GET /price/current", () => {
    it("should return current prices for default tokens", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`, {
        headers: {
          "x-test-env": "true",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data).toHaveProperty("Project89");
      expect(response.data.data.Project89).toHaveProperty("usd");
      expect(response.data.data.Project89).toHaveProperty("usd_24h_change");
    });

    it("should return prices for specified tokens", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`, {
        params: {
          symbols: "Project89",
        },
        headers: {
          "x-test-env": "true",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data).toHaveProperty("Project89");
      expect(response.data.data.Project89).toHaveProperty("usd");
      expect(response.data.data.Project89).toHaveProperty("usd_24h_change");
    });

    it("should handle errors gracefully", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/current`, {
        params: {
          symbols: "invalid_token",
        },
        headers: {
          "x-test-env": "true",
        },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("No price data found for invalid_token");
    });
  });

  describe("GET /price/history/:tokenId", () => {
    it("should return price history for a token", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/history/Project89`, {
        headers: {
          "x-test-env": "true",
        },
      });

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
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/price/history/invalid_token`, {
        headers: {
          "x-test-env": "true",
        },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Token not found");
    });
  });
});
