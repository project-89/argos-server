import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, initializeTestEnvironment, createTestData } from "../utils/testUtils";
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

describe("Fingerprint Rate Limit Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let originalRateLimitDisabled: string | undefined;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    originalRateLimitDisabled = process.env.RATE_LIMIT_DISABLED;
    // Ensure rate limiting is enabled for tests (by not setting RATE_LIMIT_DISABLED)
    delete process.env.RATE_LIMIT_DISABLED;
    delete process.env.FINGERPRINT_RATE_LIMIT_DISABLED;
    console.log("[Test Setup] Rate limiting enabled (RATE_LIMIT_DISABLED not set)");
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    // Restore original environment state
    process.env.RATE_LIMIT_DISABLED = originalRateLimitDisabled;
    console.log("[Test Cleanup] RATE_LIMIT_DISABLED restored to:", originalRateLimitDisabled);

    // Final cleanup
    const db = getFirestore();
    await cleanupRateLimitData(db);
  });

  beforeEach(async () => {
    console.log("[Test] Starting new test case");
    // Clean up rate limit data
    const db = getFirestore();
    await cleanupRateLimitData(db);

    // Create fresh test data for each test
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
    console.log("[Test Setup] Created test fingerprint:", fingerprintId);
    console.log("[Test Setup] Created test API key:", validApiKey);
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

  it("should enforce fingerprint-based rate limits", async () => {
    const responses: AxiosResponse<ApiResponse>[] = [];
    console.log(`[Test] Starting rate limit test for fingerprint: ${fingerprintId}`);

    // Make 102 requests (should get 100 successes and 2 rate limits)
    for (let i = 0; i < 102; i++) {
      try {
        console.log(`[Test] Making request ${i + 1}/102`);
        const response = await makeRequest(
          "post",
          `${API_URL}/visit/log`,
          { fingerprintId, url: `test-url-${i}` },
          {
            validateStatus: () => true,
            headers: {
              "x-api-key": validApiKey,
              // Use different IPs to bypass IP rate limit
              "X-Forwarded-For": `192.168.1.${Math.floor(i / 50) + 1}`,
            },
          },
        );
        responses.push(response);

        // Log every response status and data
        console.log(`[Test] Request ${i + 1} status:`, response.status);
        if (response.status !== 200) {
          console.log(`[Test] Non-200 response data:`, response.data);
        }

        // Log progress every 10 requests
        if (i > 0 && i % 10 === 0) {
          const currentSuccesses = responses.filter((r) => r.status === 200).length;
          const currentLimited = responses.filter((r) => r.status === 429).length;
          const otherStatuses = responses.filter(
            (r) => r.status !== 200 && r.status !== 429,
          ).length;
          console.log(
            `[Test] Progress - Request ${i + 1}/102:`,
            `\n  Successes: ${currentSuccesses}`,
            `\n  Limited: ${currentLimited}`,
            `\n  Other: ${otherStatuses}`,
          );
        }

        // Increase wait time between requests to avoid race conditions
        await wait(150); // Increased from 50ms to 150ms
      } catch (error) {
        console.error(`[Test] Error making request ${i}:`, error);
        throw error;
      }
    }

    const successResponses = responses.filter((r) => r.status === 200);
    const limitedResponses = responses.filter((r) => r.status === 429);
    const otherResponses = responses.filter((r) => r.status !== 200 && r.status !== 429);

    console.log(
      `[Test] Final results:`,
      `\n  Successes: ${successResponses.length}`,
      `\n  Limited: ${limitedResponses.length}`,
      `\n  Other: ${otherResponses.length}`,
    );

    if (otherResponses.length > 0) {
      console.log("[Test] Unexpected response statuses:");
      otherResponses.forEach((r, i) => {
        console.log(`  Response ${i + 1}: Status ${r.status}, Data:`, r.data);
      });
    }

    expect(successResponses.length).toBe(100);
    expect(limitedResponses.length).toBe(2);
    expect(otherResponses.length).toBe(0);

    // Verify rate limit response format
    const limitedResponse = limitedResponses[0];
    expect(limitedResponse.data.success).toBe(false);
    expect(limitedResponse.data.error).toBe("Too many requests, please try again later");
    expect(typeof limitedResponse.data.retryAfter).toBe("number");
  }, 60000); // Increased timeout

  it("should track rate limits separately for different fingerprints", async () => {
    // Create another test fingerprint and API key
    const { fingerprintId: otherFingerprintId, apiKey: otherApiKey } = await createTestData();
    console.log("[Test] Created second fingerprint:", otherFingerprintId);
    console.log("[Test] Created second API key:", otherApiKey);

    // Make 50 requests from first fingerprint
    for (let i = 0; i < 50; i++) {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        { fingerprintId, url: `test-url-${i}` },
        {
          validateStatus: () => true,
          headers: {
            "x-api-key": validApiKey,
            "X-Forwarded-For": "192.168.1.1",
          },
        },
      );
      expect(response.status).toBe(200);
      await wait(50);
    }

    // Make 50 requests from second fingerprint
    for (let i = 0; i < 50; i++) {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        { fingerprintId: otherFingerprintId, url: `test-url-${i}` },
        {
          validateStatus: () => true,
          headers: {
            "x-api-key": otherApiKey,
            "X-Forwarded-For": "192.168.1.2",
          },
        },
      );
      expect(response.status).toBe(200);
      await wait(50);
    }
  }, 30000);
});
