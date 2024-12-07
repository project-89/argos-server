import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";
import {
  initializeTestEnvironment,
  cleanDatabase,
  makeRequest,
  createTestData,
} from "../utils/testUtils";

describe("Visit Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  beforeAll(async () => {
    await initializeTestEnvironment();
    await createTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe("POST /visit/log", () => {
    it("should log a visit", async () => {
      const visitData = {
        fingerprintId: testFingerprint.id,
        url: "https://test.com",
        title: "Test Site",
      };

      const response = await makeRequest("post", `${API_URL}/visit/log`, visitData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("url", "https://test.com");
      expect(response.data.data).toHaveProperty("title", "Test Site");
      expect(response.data.data).toHaveProperty("timestamp");
      expect(response.data.data).toHaveProperty("siteId");
      expect(response.data.data).toHaveProperty("site");
      expect(response.data.data.site).toHaveProperty("domain", "test.com");
      expect(response.data.data.site).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data.site).toHaveProperty("visits", 1);
      expect(response.data.data.site).toHaveProperty("settings");
      expect(response.data.data.site.settings).toHaveProperty("notifications", true);
      expect(response.data.data.site.settings).toHaveProperty("privacy", "private");
    });

    it("should require fingerprintId and url", async () => {
      await expect(
        makeRequest("post", `${API_URL}/visit/log`, {
          fingerprintId: testFingerprint.id,
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
      const response = await makeRequest("post", `${API_URL}/visit/presence`, {
        fingerprintId: testFingerprint.id,
        status: "online",
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("status", "online");
      expect(response.data.data).toHaveProperty("timestamp");
    });

    it("should require fingerprintId and status", async () => {
      await expect(
        makeRequest("post", `${API_URL}/visit/presence`, {
          fingerprintId: testFingerprint.id,
          // missing status
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: status",
          },
        },
      });
    });
  });

  describe("POST /visit/site/remove", () => {
    it("should remove a site", async () => {
      // First create a site by logging a visit
      const visitData = {
        fingerprintId: testFingerprint.id,
        url: "https://test.com",
        title: "Test Site",
      };

      const createResponse = await makeRequest("post", `${API_URL}/visit/log`, visitData);
      expect(createResponse.status).toBe(200);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data.site).toBeDefined();

      const siteId = createResponse.data.data.site.id;
      expect(siteId).toBeDefined();

      const response = await makeRequest("post", `${API_URL}/visit/site/remove`, {
        fingerprintId: testFingerprint.id,
        siteId,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("siteId", siteId);
      expect(response.data.data).toHaveProperty("timestamp");

      // Verify site is removed
      const db = getFirestore();
      const siteDoc = await db.collection(COLLECTIONS.SITES).doc(siteId).get();
      expect(siteDoc.exists).toBe(false);
    });

    it("should require fingerprintId and siteId", async () => {
      await expect(
        makeRequest("post", `${API_URL}/visit/site/remove`, {
          fingerprintId: testFingerprint.id,
          // missing siteId
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: siteId",
          },
        },
      });
    });
  });

  describe("GET /visit/history/:fingerprintId", () => {
    it("should get visit history", async () => {
      // First create a visit
      await makeRequest("post", `${API_URL}/visit/log`, {
        fingerprintId: testFingerprint.id,
        url: "https://test.com",
        title: "Test Site",
      });

      const response = await makeRequest("get", `${API_URL}/visit/history/${testFingerprint.id}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      const visit = response.data.data[0];
      expect(visit).toHaveProperty("id");
      expect(visit).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(visit).toHaveProperty("url", "https://test.com");
      expect(visit).toHaveProperty("title", "Test Site");
      expect(visit).toHaveProperty("timestamp");
      expect(visit).toHaveProperty("site");
      expect(visit.site).toHaveProperty("domain", "test.com");
    });

    it("should handle missing ID parameter", async () => {
      await expect(makeRequest("get", `${API_URL}/visit/history/`)).rejects.toMatchObject({
        response: {
          status: 404,
          data: expect.stringContaining("Cannot GET /visit/history/"),
        },
      });
    });
  });
});
