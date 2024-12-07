import { describe, it, expect } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";

describe("Reality Stability Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("GET /reality-stability", () => {
    it("should get reality stability index", async () => {
      const response = await makeRequest("get", `${API_URL}/reality-stability`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data).toHaveProperty("stabilityIndex");
      expect(response.data.data).toHaveProperty("currentPrice");
      expect(response.data.data).toHaveProperty("priceChange");
      expect(response.data.data).toHaveProperty("timestamp");
      expect(typeof response.data.data.stabilityIndex).toBe("number");
      expect(response.data.data.stabilityIndex).toBeGreaterThanOrEqual(0);
      expect(response.data.data.stabilityIndex).toBeLessThanOrEqual(100);
    });

    it("should handle service errors gracefully", async () => {
      const response = await makeRequest("get", `${API_URL}/reality-stability?invalid=true`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Failed to calculate reality stability index");
    });
  });
});
