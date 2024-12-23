import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";

describe("Reality Stability Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  beforeEach(() => {
    // Set NODE_ENV to test to ensure we use mock data
    process.env.NODE_ENV = "test";
    process.env.FUNCTIONS_EMULATOR = "true";
  });

  describe("GET /reality-stability", () => {
    it("should return stability index", async () => {
      const response = await makeRequest("get", `${API_URL}/reality-stability`);
      console.log("Response:", response.data);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        success: true,
        data: {
          stabilityIndex: 95, // 100 - |-5|
          currentPrice: 100,
          priceChange: -5,
          timestamp: expect.any(Number),
        },
        message: "Reality stability index calculated",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it("should handle calculation errors", async () => {
      const response = await makeRequest(
        "get",
        `${API_URL}/reality-stability?invalid=true`,
        undefined,
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        success: false,
        error: "Failed to calculate reality stability index",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it("should handle invalid query parameter", async () => {
      const response = await makeRequest(
        "get",
        `${API_URL}/reality-stability?invalid=true`,
        undefined,
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        success: false,
        error: "Failed to calculate reality stability index",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });
});
