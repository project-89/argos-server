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
  let originalRateLimitEnabled: string | undefined;
  let originalIpRateLimitEnabled: string | undefined;
  let fingerprintId: string;
  let apiKey: string;

  beforeAll(async () => {
    // Store original values
    originalRateLimitEnabled = process.env.RATE_LIMIT_ENABLED;
    originalIpRateLimitEnabled = process.env.IP_RATE_LIMIT_ENABLED;

    // Set environment variables for testing
    process.env.RATE_LIMIT_ENABLED = "true";
    process.env.IP_RATE_LIMIT_ENABLED = "true";
    process.env.IP_RATE_LIMIT_MAX = "200";

    // Log all relevant environment variables
    console.log("[Test Setup] Environment variables:");
    console.log("  RATE_LIMIT_ENABLED:", process.env.RATE_LIMIT_ENABLED);
    console.log("  IP_RATE_LIMIT_ENABLED:", process.env.IP_RATE_LIMIT_ENABLED);
    console.log("  IP_RATE_LIMIT_MAX:", process.env.IP_RATE_LIMIT_MAX);
    console.log("  FUNCTIONS_EMULATOR:", process.env.FUNCTIONS_EMULATOR);
    console.log("  FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);

    await initializeTestEnvironment();
  });

  afterAll(async () => {
    // Restore original values
    process.env.RATE_LIMIT_ENABLED = originalRateLimitEnabled;
    process.env.IP_RATE_LIMIT_ENABLED = originalIpRateLimitEnabled;
    process.env.IP_RATE_LIMIT_MAX = undefined;

    console.log("[Test Cleanup] Environment variables restored:");
    console.log("  RATE_LIMIT_ENABLED:", process.env.RATE_LIMIT_ENABLED);
    console.log("  IP_RATE_LIMIT_ENABLED:", process.env.IP_RATE_LIMIT_ENABLED);
    console.log("  IP_RATE_LIMIT_MAX:", process.env.IP_RATE_LIMIT_MAX);

    // Final cleanup
    const db = getFirestore();
    await cleanupRateLimitData(db);
  });

  beforeEach(async () => {
    console.log("[Test] Starting new test case");

    // Clean up rate limit data before each test
    const db = getFirestore();
    await cleanupRateLimitData(db);

    // Create fresh test data for each test
    const { fingerprintId: fId, apiKey: key } = await createTestData();
    fingerprintId = fId;
    apiKey = key;
    console.log("[Test Setup] Created test fingerprint:", fingerprintId);
    console.log("[Test Setup] Created test API key:", apiKey);

    // Wait for test data to be fully propagated
    await wait(1000);
  });

  // Helper function to clean up rate limit data
  async function cleanupRateLimitData(db: FirebaseFirestore.Firestore) {
    console.log("[Cleanup] Starting rate limit data cleanup");

    // Clean up fingerprint rate limits
    const fingerprintSnapshot = await db
      .collection(COLLECTIONS.RATE_LIMITS)
      .where("type", "==", "fingerprint")
      .get();

    // Clean up IP rate limits
    const ipSnapshot = await db.collection(COLLECTIONS.RATE_LIMITS).where("type", "==", "ip").get();

    const batch = db.batch();
    let deletedCount = 0;

    if (!fingerprintSnapshot.empty) {
      fingerprintSnapshot.docs.forEach((doc) => {
        console.log(`[Cleanup] Deleting fingerprint rate limit document: ${doc.id}`);
        batch.delete(doc.ref);
        deletedCount++;
      });
    }

    if (!ipSnapshot.empty) {
      ipSnapshot.docs.forEach((doc) => {
        console.log(`[Cleanup] Deleting IP rate limit document: ${doc.id}`);
        batch.delete(doc.ref);
        deletedCount++;
      });
    }

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`[Cleanup] Deleted ${deletedCount} rate limit documents`);
      // Wait longer after cleanup to ensure propagation
      await wait(2000);
    } else {
      console.log("[Cleanup] No rate limit documents to delete");
      await wait(1000);
    }
  }

  it("should enforce fingerprint-based rate limits", async () => {
    const responses: AxiosResponse<ApiResponse>[] = [];
    console.log(`[Test] Starting rate limit test for fingerprint: ${fingerprintId}`);
    console.log("[Test] Current environment variables:");
    console.log("  RATE_LIMIT_ENABLED:", process.env.RATE_LIMIT_ENABLED);
    console.log("  IP_RATE_LIMIT_ENABLED:", process.env.IP_RATE_LIMIT_ENABLED);

    // Make requests in smaller batches to avoid timing issues
    for (let i = 0; i < 102; i++) {
      try {
        console.log(`[Test] Making request ${i + 1}/102`);
        const response = await makeRequest(
          "post",
          `${API_URL}/visit/log`,
          {
            fingerprintId,
            url: `https://test.com/page-${i}`,
          },
          {
            validateStatus: () => true,
            headers: {
              "x-api-key": apiKey,
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
        await wait(150); // Increased from 100ms to 150ms
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
  }, 60000);

  it("should track rate limits separately for different fingerprints", async () => {
    // Create another test fingerprint and API key
    const { fingerprintId: otherFingerprintId, apiKey: otherApiKey } = await createTestData();
    console.log("[Test] Created second fingerprint:", otherFingerprintId);
    console.log("[Test] Created second API key:", otherApiKey);

    // Wait for the second test data to be fully propagated
    await wait(1000);

    // Make requests in parallel for both fingerprints
    const makeRequestsForFingerprint = async (fId: string, key: string, prefix: string) => {
      const responses: AxiosResponse<ApiResponse>[] = [];
      for (let i = 0; i < 50; i++) {
        try {
          const response = await makeRequest(
            "post",
            `${API_URL}/visit/log`,
            {
              fingerprintId: fId,
              url: `https://test.com/${prefix}-${i}`,
            },
            {
              validateStatus: () => true,
              headers: {
                "x-api-key": key,
              },
            },
          );
          responses.push(response);
          await wait(50);
        } catch (error) {
          console.error(`[Test] Error making request for ${prefix}:`, error);
          throw error;
        }
      }
      return responses;
    };

    // Run requests for both fingerprints concurrently
    const [firstResponses, secondResponses] = await Promise.all([
      makeRequestsForFingerprint(fingerprintId, apiKey, "first"),
      makeRequestsForFingerprint(otherFingerprintId, otherApiKey, "second"),
    ]);

    console.log(
      `[Test] First fingerprint results - Successes: ${firstResponses.filter((r) => r.status === 200).length}`,
    );
    console.log(
      `[Test] Second fingerprint results - Successes: ${secondResponses.filter((r) => r.status === 200).length}`,
    );

    // Verify all responses were successful since each fingerprint is under the limit
    expect(firstResponses.every((r) => r.status === 200)).toBe(true);
    expect(secondResponses.every((r) => r.status === 200)).toBe(true);
  }, 60000); // Increased timeout
});
