import axios from "axios";
import { TEST_CONFIG } from "./setup";
import { describe, it, expect } from "@jest/globals";
import { MatrixIntegrity } from "@/types";

describe("Reality Stability Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("GET /reality-stability", () => {
    it("should get reality stability index", async () => {
      const response = await axios.get(`${API_URL}/reality-stability`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("realityStabilityIndex");
      expect(response.data).toHaveProperty("resistanceLevel");
      expect(response.data).toHaveProperty("metadata");

      // Check metadata structure
      const { metadata } = response.data;
      expect(metadata).toHaveProperty("currentPrice");
      expect(metadata).toHaveProperty("shortTermChange");
      expect(metadata).toHaveProperty("mediumTermChange");
      expect(metadata).toHaveProperty("recentVolatility");
      expect(metadata).toHaveProperty("resistanceImpact");
      expect(metadata).toHaveProperty("simulationResponse");
      expect(metadata).toHaveProperty("matrixIntegrity");
      expect(metadata).toHaveProperty("timestamp");

      // Validate value ranges
      expect(response.data.realityStabilityIndex).toBeGreaterThanOrEqual(89);
      expect(response.data.realityStabilityIndex).toBeLessThanOrEqual(99.99);
      expect(response.data.resistanceLevel).toBeGreaterThanOrEqual(0.01);

      // Validate matrix integrity values
      expect(["STABLE", "FLUCTUATING", "UNSTABLE", "CRITICAL"] as MatrixIntegrity[]).toContain(
        metadata.matrixIntegrity,
      );
    });

    it("should handle calculation errors gracefully", async () => {
      // Mock an error condition by passing invalid parameters
      try {
        await axios.get(`${API_URL}/reality-stability?forceError=true`);
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBeTruthy();
      }
    });
  });
});
