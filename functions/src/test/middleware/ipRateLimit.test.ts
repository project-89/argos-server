import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, initializeTestEnvironment } from "../utils/testUtils";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";
import { AxiosResponse } from "axios";

interface ApiResponse {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

// Helper function to wait between requests
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("IP Rate Limit Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let originalRateLimitEnabled: string | undefined;

  beforeAll(async () => {
    originalRateLimitEnabled = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = "true";
    console.log("[Test Setup] RATE_LIMIT_ENABLED:", process.env.RATE_LIMIT_ENABLED);
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    process.env.RATE_LIMIT_ENABLED = originalRateLimitEnabled;
    console.log("[Test Cleanup] RATE_LIMIT_ENABLED restored to:", originalRateLimitEnabled);

    // Final cleanup
    const db = getFirestore();
    await cleanupRateLimitData(db);
  });

  beforeEach(async () => {
    console.log("[Test] Starting new test case");
    // Clean up rate limit data
    const db = getFirestore();
    await cleanupRateLimitData(db);
  });

  // Helper function to clean up rate limit data
  async function cleanupRateLimitData(db: FirebaseFirestore.Firestore) {
    console.log("[Cleanup] Starting rate limit data cleanup");
    const snapshot = await db.collection(COLLECTIONS.RATE_LIMITS).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`[Cleanup] Deleted ${snapshot.docs.length} rate limit documents`);
    } else {
      console.log("[Cleanup] No rate limit documents to delete");
    }
    await wait(1000); // Wait for cleanup to propagate
  }

  it("should enforce IP-based rate limits", async () => {
    const responses: AxiosResponse<ApiResponse>[] = [];
    const testIp = "192.168.1.1";
    console.log(`[Test] Starting rate limit test for IP: ${testIp}`);

    // Make 102 requests (should get 100 successes and 2 rate limits)
    for (let i = 0; i < 102; i++) {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        { fingerprint: `test-fingerprint-${i}` },
        {
          validateStatus: () => true,
          headers: { "X-Forwarded-For": testIp },
        },
      );
      responses.push(response);

      // Log progress every 10 requests
      if (i > 0 && i % 10 === 0) {
        const currentSuccesses = responses.filter((r) => r.status === 200).length;
        const currentLimited = responses.filter((r) => r.status === 429).length;
        console.log(
          `[Test] Progress - Request ${i + 1}/102, Successes: ${currentSuccesses}, Limited: ${currentLimited}`,
        );
      }

      await wait(50); // Small delay between requests
    }

    const successResponses = responses.filter((r) => r.status === 200);
    const limitedResponses = responses.filter((r) => r.status === 429);

    console.log(
      `[Test] Final results - Successes: ${successResponses.length}, Limited: ${limitedResponses.length}`,
    );

    expect(successResponses.length).toBe(100);
    expect(limitedResponses.length).toBe(2);

    // Verify rate limit response format
    const limitedResponse = limitedResponses[0];
    expect(limitedResponse.data.success).toBe(false);
    expect(limitedResponse.data.error).toBe("Too many requests, please try again later");
    expect(typeof limitedResponse.data.retryAfter).toBe("number");
  }, 30000);

  it("should track rate limits separately for different IPs", async () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";

    // Make 50 requests from first IP
    for (let i = 0; i < 50; i++) {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        { fingerprint: `ip1-fingerprint-${i}` },
        {
          validateStatus: () => true,
          headers: { "X-Forwarded-For": ip1 },
        },
      );
      expect(response.status).toBe(200);
      await wait(50);
    }

    // Make 50 requests from second IP
    for (let i = 0; i < 50; i++) {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        { fingerprint: `ip2-fingerprint-${i}` },
        {
          validateStatus: () => true,
          headers: { "X-Forwarded-For": ip2 },
        },
      );
      expect(response.status).toBe(200);
      await wait(50);
    }
  }, 30000);
});
