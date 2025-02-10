import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";

const { apiUrl: API_URL } = TEST_CONFIG;

describe("Presence Endpoint", () => {
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const testData = await createTestData();
    validApiKey = testData.apiKey;
    fingerprintId = testData.fingerprintId;
  });

  afterAll(async () => {
    await destroyAgent();
  });

  describe("PUT /presence/:fingerprintId", () => {
    it("should update presence status successfully", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "online",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("online");
      expect(response.data.data.lastUpdated).toBeDefined();
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "online",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should require status", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {},
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          path: ["body", "status"],
          message: "Required",
          expected: "'online' | 'offline' | 'away'",
          received: "undefined",
        },
      ]);
    });

    it("should validate status value", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "invalid",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        "Invalid enum value. Expected 'online' | 'offline' | 'away', received 'invalid'",
      );
      expect(response.data.details).toEqual([
        {
          code: "invalid_enum_value",
          path: ["body", "status"],
          message: "Invalid enum value. Expected 'online' | 'offline' | 'away', received 'invalid'",
        },
      ]);
    });

    it("should require fingerprintId in URL", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/`,
        data: {
          status: "online",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
    });

    it("should handle non-existent fingerprint", async () => {
      // Create a second fingerprint and API key
      const { fingerprintId: targetId, apiKey } = await createTestData();

      // Delete the target fingerprint
      const db = getFirestore();
      await db.collection(COLLECTIONS.FINGERPRINTS).doc(targetId).delete();

      // Try to update presence for the deleted fingerprint using its API key
      const response = await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${targetId}`,
        data: {
          status: "online",
        },
        headers: { "x-api-key": apiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
    });
  });

  describe("GET /presence/:fingerprintId", () => {
    it("should get presence status successfully", async () => {
      // First set a presence status
      await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "online",
        },
        headers: { "x-api-key": validApiKey },
      });

      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/presence/${fingerprintId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("online");
      expect(response.data.data.lastUpdated).toBeDefined();
    });

    it("should return offline for new fingerprint", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/presence/${fingerprintId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("offline");
    });

    it("should require fingerprintId in URL", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/presence/`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /presence/:fingerprintId/activity", () => {
    it("should update activity timestamp successfully", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/presence/${fingerprintId}/activity`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("online");
      expect(response.data.data.lastUpdated).toBeDefined();
    });

    it("should set status to online when updating activity for offline user", async () => {
      // First set status to offline
      await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "offline",
        },
        headers: { "x-api-key": validApiKey },
      });

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/presence/${fingerprintId}/activity`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("online");
    });

    it("should set status to online when updating activity for away user", async () => {
      // First set status to away
      await makeRequest({
        method: "put",
        url: `${API_URL}/presence/${fingerprintId}`,
        data: {
          status: "away",
        },
        headers: { "x-api-key": validApiKey },
      });

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/presence/${fingerprintId}/activity`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe("online");
    });

    it("should require fingerprintId in URL", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/presence//activity`,
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
    });
  });
});
