import { describe, it, expect } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";

describe("Debug Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("POST /debug/cleanup", () => {
    it("should perform cleanup operation", async () => {
      const response = await axios.post(`${API_URL}/debug/cleanup`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("priceCache");
      expect(response.data.data).toHaveProperty("rateLimitStats");
      expect(response.data.data).toHaveProperty("rateLimitRequests");
      expect(response.data.data).toHaveProperty("total");
      expect(typeof response.data.data.total).toBe("number");
    });

    it("should handle cleanup errors gracefully", async () => {
      // Force an error by mocking the cleanup service to throw
      // This is handled by the endpoint's error handling
      const response = await axios.post(`${API_URL}/debug/cleanup?error=true`);

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBeTruthy();
    });
  });
});
