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
    it("should log a visit", async () => {
      const visitData = {
        fingerprintId,
        url: "https://test.com",
        title: "Test Site",
      };

      const response = await makeRequest("post", `${API_URL}/visit/log`, visitData);

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

    it("should require fingerprintId and url", async () => {
      await expect(
        makeRequest("post", `${API_URL}/visit/log`, {
          fingerprintId,
          // missing url
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: url",
          },
        },
      });
    });

    it("should handle non-existent fingerprint", async () => {
      await expect(
        makeRequest("post", `${API_URL}/visit/log`, {
          fingerprintId: "non-existent-id",
          url: "https://test.com",
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            success: false,
            error: "Fingerprint not found",
          },
        },
      });
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
          // missing status
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: status");
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

      const createResponse = await makeRequest("post", `${API_URL}/visit/log`, visitData);
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

    it("should require fingerprintId and siteId", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/visit/site/remove`,
        {
          fingerprintId,
          // missing siteId
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: siteId");
    });
  });

  describe("GET /visit/history/:fingerprintId", () => {
    it("should get visit history", async () => {
      // First create a visit
      await makeRequest("post", `${API_URL}/visit/log`, {
        fingerprintId,
        url: "https://test.com",
        title: "Test Site",
      });

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
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data).toMatch(/Cannot GET \/visit\/history\//);
    });
  });
});
