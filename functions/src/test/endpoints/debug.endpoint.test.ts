import { describe, it, expect, beforeAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, initializeTestEnvironment, createTestData } from "../utils/testUtils";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Debug Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;

    // Assign admin role to the test fingerprint
    const db = getFirestore();
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(fingerprintId)
      .update({
        roles: ["user", "admin"],
      });
  });

  describe("POST /admin/debug/cleanup", () => {
    it("should clean up test data", async () => {
      const response = await makeRequest("post", `${API_URL}/admin/debug/cleanup`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("cleanupTime");
      expect(response.data.data).toHaveProperty("itemsCleaned");
      expect(response.data.data.itemsCleaned).toHaveProperty("visits");
      expect(response.data.data.itemsCleaned).toHaveProperty("presence");
      expect(response.data.data.itemsCleaned).toHaveProperty("priceCache");
      expect(response.data.data.itemsCleaned).toHaveProperty("rateLimitStats");
      expect(response.data.data.itemsCleaned).toHaveProperty("rateLimitRequests");
    });

    it("should handle cleanup errors gracefully", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/debug/cleanup?error=true`,
        null,
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Simulated error for testing");
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest("post", `${API_URL}/admin/debug/cleanup`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest("post", `${API_URL}/admin/debug/cleanup`, null, {
        headers: { "x-api-key": "invalid-key" },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request from non-admin user", async () => {
      // Create a new fingerprint without admin role
      const { apiKey: nonAdminKey } = await createTestData();

      const response = await makeRequest("post", `${API_URL}/admin/debug/cleanup`, null, {
        headers: { "x-api-key": nonAdminKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });
});
