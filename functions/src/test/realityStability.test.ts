import { initializeTestEnvironment } from "./testUtils";
import { TEST_CONFIG } from "./testConfig";
import axios from "axios";

jest.setTimeout(180000); // Increase timeout to 3 minutes

describe("Reality Stability Endpoint", () => {
  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("GET /reality-stability", () => {
    it("should get reality stability index", async () => {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}/reality-stability`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("realityStabilityIndex");
      expect(response.data).toHaveProperty("metadata");
      expect(response.data.metadata).toHaveProperty("currentPrice");
    });

    it("should handle calculation errors gracefully", async () => {
      // Mock a failure scenario
      const mockError = new Error("Calculation failed");
      jest.spyOn(global, "fetch").mockRejectedValueOnce(mockError);

      try {
        await axios.get(`${TEST_CONFIG.apiUrl}/reality-stability`);
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data).toHaveProperty("error");
      }
    });
  });
});
