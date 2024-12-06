import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Debug Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  beforeEach(async () => {
    // Create some test data to clean up
    const db = getFirestore();
    const now = Date.now();
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;

    // Create old visit
    await db.collection(COLLECTIONS.VISITS).add({
      timestamp: thirtyOneDaysAgo,
      fingerprintId: "test-id",
      url: "test-url",
    });

    // Create old presence
    await db.collection(COLLECTIONS.PRESENCE).add({
      lastUpdated: thirtyOneDaysAgo,
      fingerprintId: "test-id",
      status: "online",
    });

    // Create old price cache
    await db.collection(COLLECTIONS.PRICE_CACHE).add({
      timestamp: thirtyOneDaysAgo,
      symbol: "test-symbol",
      price: 100,
    });

    // Create old rate limit stats
    await db.collection(COLLECTIONS.RATE_LIMIT_STATS).add({
      timestamp: thirtyOneDaysAgo,
      identifier: "test-id",
      count: 100,
    });

    // Create old rate limit requests
    await db.collection(COLLECTIONS.RATE_LIMITS).add({
      lastUpdated: thirtyOneDaysAgo,
      identifier: "test-id",
      requests: [thirtyOneDaysAgo],
    });
  });

  describe("POST /debug/cleanup", () => {
    it("should perform cleanup operation", async () => {
      const response = await makeRequest("post", `${API_URL}/debug/cleanup`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("cleanupTime");
      expect(response.data.data).toHaveProperty("itemsCleaned");
      expect(response.data.data.itemsCleaned.visits).toBe(1);
      expect(response.data.data.itemsCleaned.presence).toBe(1);
      expect(response.data.data.itemsCleaned.priceCache).toBe(1);
      expect(response.data.data.itemsCleaned.rateLimitStats).toBe(1);
      expect(response.data.data.itemsCleaned.rateLimitRequests).toBe(1);
    });

    it("should handle cleanup errors gracefully", async () => {
      // Force an error by mocking the cleanup service to throw
      // This is handled by the endpoint's error handling
      const response = await makeRequest("post", `${API_URL}/debug/cleanup?error=true`);

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Simulated error for testing");
    });
  });
});
