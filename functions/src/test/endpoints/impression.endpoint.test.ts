import { describe, expect, it, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { COLLECTIONS } from "../../constants/collections";
import * as admin from "firebase-admin";

describe("Impression Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /impressions", () => {
    it("should create an impression with valid API key", async () => {
      const impressionData = {
        fingerprintId,
        type: "test-type",
        data: { test: true },
      };

      const response = await makeRequest("post", `${API_URL}/impressions`, impressionData, {
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("type", "test-type");
      expect(response.data.data).toHaveProperty("data", { test: true });
      expect(response.data.data).toHaveProperty("createdAt");
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/impressions`,
        {
          fingerprintId,
          type: "test-type",
          data: { test: true },
        },
        {
          headers: {},
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/impressions`,
        {
          fingerprintId,
          type: "test-type",
          data: { test: true },
        },
        {
          headers: {
            "x-api-key": "invalid-key",
          },
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
        `${API_URL}/impressions`,
        {
          fingerprintId,
          type: "test-type",
          data: { test: true },
        },
        {
          headers: {
            "x-api-key": otherApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });

  describe("GET /impressions/:fingerprintId", () => {
    it("should get impressions for a fingerprint", async () => {
      // Create test impression first
      const db = admin.firestore();
      const impressionRef = await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
        createdAt: admin.firestore.Timestamp.now(),
      });

      const response = await makeRequest("get", `${API_URL}/impressions/${fingerprintId}`, null, {
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toHaveProperty("id", impressionRef.id);
      expect(response.data.data[0]).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data[0]).toHaveProperty("type", "form_submission");
      expect(response.data.data[0]).toHaveProperty("data.formId", "contact");
    });

    it("should filter by type", async () => {
      // Create test impressions
      const db = admin.firestore();
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
        createdAt: admin.firestore.Timestamp.now(),
      });
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "page_view",
        data: { url: "/test" },
        createdAt: admin.firestore.Timestamp.now(),
      });

      const response = await makeRequest("get", `${API_URL}/impressions/${fingerprintId}`, null, {
        headers: {
          "x-api-key": validApiKey,
        },
        params: { type: "form_submission" },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toHaveProperty("type", "form_submission");
    });

    it("should require authentication", async () => {
      const response = await makeRequest("get", `${API_URL}/impressions/${fingerprintId}`, null, {
        headers: {},
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should validate fingerprintId matches API key", async () => {
      // Create another fingerprint
      const otherTestData = await createTestData();

      const response = await makeRequest(
        "get",
        `${API_URL}/impressions/${otherTestData.fingerprintId}`,
        null,
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });

  describe("DELETE /impressions/:fingerprintId", () => {
    it("should delete all impressions for a fingerprint", async () => {
      // Create test impressions
      const db = admin.firestore();
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
        createdAt: admin.firestore.Timestamp.now(),
      });
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "page_view",
        data: { url: "/test" },
        createdAt: admin.firestore.Timestamp.now(),
      });

      const response = await makeRequest(
        "delete",
        `${API_URL}/impressions/${fingerprintId}`,
        null,
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("deletedCount", 2);

      // Verify impressions are deleted
      const snapshot = await db
        .collection(COLLECTIONS.IMPRESSIONS)
        .where("fingerprintId", "==", fingerprintId)
        .get();
      expect(snapshot.empty).toBe(true);
    });

    it("should filter deletions by type", async () => {
      // Create test impressions
      const db = admin.firestore();
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
        createdAt: admin.firestore.Timestamp.now(),
      });
      await db.collection(COLLECTIONS.IMPRESSIONS).add({
        fingerprintId,
        type: "page_view",
        data: { url: "/test" },
        createdAt: admin.firestore.Timestamp.now(),
      });

      const response = await makeRequest(
        "delete",
        `${API_URL}/impressions/${fingerprintId}`,
        null,
        {
          headers: {
            "x-api-key": validApiKey,
          },
          params: { type: "form_submission" },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("deletedCount", 1);

      // Verify only form_submission impressions are deleted
      const snapshot = await db
        .collection(COLLECTIONS.IMPRESSIONS)
        .where("fingerprintId", "==", fingerprintId)
        .get();
      expect(snapshot.size).toBe(1);
      expect(snapshot.docs[0].data().type).toBe("page_view");
    });

    it("should require authentication", async () => {
      const response = await makeRequest(
        "delete",
        `${API_URL}/impressions/${fingerprintId}`,
        null,
        {
          headers: {},
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should validate fingerprintId matches API key", async () => {
      // Create another fingerprint
      const otherTestData = await createTestData();

      const response = await makeRequest(
        "delete",
        `${API_URL}/impressions/${otherTestData.fingerprintId}`,
        null,
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });
});
