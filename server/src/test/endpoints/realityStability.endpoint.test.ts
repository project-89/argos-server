import { describe, it, expect, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, cleanDatabase } from "../utils/testUtils";

describe("Reality Stability Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  afterAll(async () => {
    await cleanDatabase();
    // Wait for any pending promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("should return reality stability score", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${API_URL}/reality-stability`,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty("stabilityIndex");
    expect(typeof response.data.data.stabilityIndex).toBe("number");
    expect(response.data.data.stabilityIndex).toBeGreaterThanOrEqual(89);
    expect(response.data.data.stabilityIndex).toBeLessThanOrEqual(100);
    expect(response.data.data).toHaveProperty("currentPrice");
    expect(response.data.data).toHaveProperty("priceChange");
    expect(response.data.data).toHaveProperty("timestamp");
    // Verify timestamp is recent
    expect(Date.now() - response.data.data.timestamp).toBeLessThan(5000);
  });

  it("should handle missing token gracefully", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${API_URL}/reality-stability`,
    });

    // Even if token doesn't exist, we should get a valid response
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty("stabilityIndex");
    expect(response.data.data.stabilityIndex).toBeGreaterThanOrEqual(89);
    expect(response.data.data.stabilityIndex).toBeLessThanOrEqual(100);
  });
});
