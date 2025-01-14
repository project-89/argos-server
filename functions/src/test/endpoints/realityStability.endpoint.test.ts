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

  it("should return reality stability score", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${API_URL}/reality-stability`,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty("stabilityIndex");
    expect(typeof response.data.data.stabilityIndex).toBe("number");
    expect(response.data.data).toHaveProperty("currentPrice");
    expect(response.data.data).toHaveProperty("priceChange");
    expect(response.data.data).toHaveProperty("timestamp");
  });
});
