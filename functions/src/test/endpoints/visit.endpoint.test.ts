import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";
import { COLLECTIONS } from "../../constants";
import * as admin from "firebase-admin";

describe("Visit Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /visit/log", () => {
    it("should log a visit with valid API key", async () => {
      const visitData = {
        fingerprintId,
        url: "https://test.com",
        title: "Test Site",
      };

      const response = await makeRequest("post", `${API_URL}/visit/log`, visitData, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("url", "https://test.com");
      expect(response.data.data).toHaveProperty("title", "Test Site");
      expect(response.data.data).toHaveProperty("timestamp");
      expect(response.data.data).toHaveProperty("siteId");
      expect(response.data.data).toHaveProperty("site");
      expect(response.data.data.site).toHaveProperty("domain", "test.com");
      expect(response.data.data.site).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data.site).toHaveProperty("visits", 1);
      expect(response.data.data.site).toHaveProperty("settings");
      expect(response.data.data.site.settings).toHaveProperty("notifications", true);
      expect(response.data.data.site.settings).toHaveProperty("privacy", "private");
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
        },
        {
          headers: { "x-api-key": "invalid-key" },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });

    it("should require fingerprintId and url", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": validApiKey,
            Origin: "http://localhost:5173",
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["url"],
          message: "Required",
        },
      ]);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId: "non-existent-id",
          url: "https://test.com",
        },
        {
          headers: {
            "x-api-key": validApiKey,
            Origin: "http://localhost:5173",
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should increment visit count for existing site", async () => {
      // First visit
      await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Test Site",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      // Second visit
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Updated Title",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.site).toHaveProperty("visits", 2);
      expect(response.data.data.site).toHaveProperty("title", "Updated Title");
    });
  });

  describe("POST /visit/presence", () => {
    it("should update presence status", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("status", "online");
      expect(response.data.data).toHaveProperty("timestamp");
    });

    it("should require fingerprintId and status", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["status"],
          message: "Required",
        },
      ]);
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": "invalid-key" },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });

    it("should handle non-existent fingerprint", async () => {
      // Create a new fingerprint and get its API key
      const { fingerprintId: newFingerprintId, apiKey: newApiKey } = await createTestData();

      // Delete the fingerprint but keep its API key
      const db = admin.firestore();
      await db.collection(COLLECTIONS.FINGERPRINTS).doc(newFingerprintId).delete();

      const response = await makeRequest(
        "post",
        `${API_URL}/visit/presence`,
        {
          fingerprintId: newFingerprintId,
          status: "online",
        },
        {
          headers: { "x-api-key": newApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });
  });

  describe("POST /visit/site/remove", () => {
    it("should remove a site", async () => {
      // First create a site by logging a visit
      const visitData = {
        fingerprintId,
        url: "https://test.com",
        title: "Test Site",
      };

      const createResponse = await makeRequest("post", `${API_URL}/visit/log`, visitData, {
        headers: { "x-api-key": validApiKey },
      });
      expect(createResponse.status).toBe(200);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data.site).toBeDefined();

      const siteId = createResponse.data.data.site.id;
      expect(siteId).toBeDefined();

      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId,
          siteId,
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("siteId", siteId);
      expect(response.data.data).toHaveProperty("timestamp");

      // Verify site is removed
      const db = admin.firestore();
      const siteDoc = await db.collection(COLLECTIONS.SITES).doc(siteId).get();
      expect(siteDoc.exists).toBe(false);
    });

    it("should require valid API key for site removal", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId,
          siteId: "test-site-id",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should prevent removing site with mismatched fingerprint", async () => {
      // Create a visit first
      const visitResponse = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Test Site",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const siteId = visitResponse.data.data.site.id;

      // Create another fingerprint
      const { fingerprintId: otherFingerprintId, apiKey: otherApiKey } = await createTestData();

      // Try to remove the site with different fingerprint
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId: otherFingerprintId,
          siteId,
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Not authorized to remove this site");
    });
  });

  describe("GET /visit/history/:fingerprintId", () => {
    it("should get visit history", async () => {
      // First create a visit
      await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Test Site",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const response = await makeRequest("get", `${API_URL}/visit/history/${fingerprintId}`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      const visit = response.data.data[0];
      expect(visit).toHaveProperty("id");
      expect(visit).toHaveProperty("fingerprintId", fingerprintId);
      expect(visit).toHaveProperty("url", "https://test.com");
      expect(visit).toHaveProperty("title", "Test Site");
      expect(visit).toHaveProperty("timestamp");
      expect(visit).toHaveProperty("site");
      expect(visit.site).toHaveProperty("domain", "test.com");
    });

    it("should handle missing ID parameter", async () => {
      const response = await makeRequest("get", `${API_URL}/visit/history/`, null, {
        validateStatus: () => true,
        headers: {
          "x-api-key": validApiKey,
          Accept: "application/json",
        },
      });

      expect(response.status).toBe(404);
      expect(response.data).toEqual({
        success: false,
        error: "Not Found",
        message: "The requested endpoint does not exist",
      });
    });
  });

  describe("GET /visit/history", () => {
    it("should get visit history for fingerprint", async () => {
      // Create some visits
      await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test1.com",
          title: "Test Site 1",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test2.com",
          title: "Test Site 2",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const response = await makeRequest("get", `${API_URL}/visit/history/${fingerprintId}`, null, {
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data[0]).toHaveProperty("url", "https://test2.com");
      expect(response.data.data[1]).toHaveProperty("url", "https://test1.com");
    });

    it("should require valid API key for history", async () => {
      const response = await makeRequest("get", `${API_URL}/visit/history/${fingerprintId}`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });
  });

  describe("POST /visit/remove-site", () => {
    it("should remove site and associated visits", async () => {
      // First create a site by logging a visit
      const visitData = {
        fingerprintId,
        url: "https://test.com",
        title: "Test Site",
      };

      const createResponse = await makeRequest("post", `${API_URL}/visit/log`, visitData, {
        headers: { "x-api-key": validApiKey },
      });
      expect(createResponse.status).toBe(200);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data.site).toBeDefined();

      const siteId = createResponse.data.data.site.id;
      expect(siteId).toBeDefined();

      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId,
          siteId,
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("siteId", siteId);
      expect(response.data.data).toHaveProperty("timestamp");

      // Verify site is removed
      const db = admin.firestore();
      const siteDoc = await db.collection(COLLECTIONS.SITES).doc(siteId).get();
      expect(siteDoc.exists).toBe(false);
    });

    it("should require valid API key for site removal", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId,
          siteId: "test-site-id",
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should prevent removing site with mismatched fingerprint", async () => {
      // Create a visit first
      const visitResponse = await makeRequest(
        "post",
        `${API_URL}/visit/log`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Test Site",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const siteId = visitResponse.data.data.site.id;

      // Create another fingerprint
      const { fingerprintId: otherFingerprintId, apiKey: otherApiKey } = await createTestData();

      // Try to remove the site with different fingerprint
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId: otherFingerprintId,
          siteId,
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Not authorized to remove this site");
    });
  });
});
