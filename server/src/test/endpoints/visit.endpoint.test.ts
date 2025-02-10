import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Visit Endpoint", () => {
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const testData = await createTestData();
    validApiKey = testData.apiKey;
    fingerprintId = testData.fingerprintId;
  });

  describe("POST /visit", () => {
    it("should log a visit with valid data", async () => {
      const visitData = {
        fingerprintId,
        url: "https://example.com",
        title: "Example Site",
      };

      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit`,
        data: visitData,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("Visit logged successfully");
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("url", "https://example.com");
      expect(response.data.data).toHaveProperty("title", "Example Site");
    });

    it("should validate required fields", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit`,
        data: {
          fingerprintId,
          // Missing url
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_URL);
    });

    it("should validate URL format", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit`,
        data: {
          fingerprintId,
          url: "not-a-url",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_URL);
    });
  });

  describe("POST /visit/presence", () => {
    it("should update presence status", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit/presence`,
        data: {
          fingerprintId,
          status: "online",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("Presence status updated");
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("status", "online");
    });

    it("should validate status values", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit/presence`,
        data: {
          fingerprintId,
          status: "invalid-status",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        "Invalid enum value. Expected 'online' | 'offline', received 'invalid-status'",
      );
    });
  });

  describe("POST /visit/remove-site", () => {
    it("should remove site and visits", async () => {
      // First create a visit
      const createResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit`,
        data: {
          fingerprintId,
          url: "https://example.com",
          title: "Example Site",
        },
        headers: { "x-api-key": validApiKey },
      });

      const siteId = createResponse.data.data.site.id;

      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit/remove-site`,
        data: {
          fingerprintId,
          siteId,
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("Site and visits removed");
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("siteId", siteId);
    });

    it("should require valid siteId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit/remove-site`,
        data: {
          fingerprintId,
          // Missing siteId
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.SITE_NOT_FOUND);
    });
  });

  describe("GET /visit/history/:fingerprintId", () => {
    it("should return visit history", async () => {
      // First create some visits
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/visit`,
        data: {
          fingerprintId,
          url: "https://example.com",
          title: "Example Site",
        },
        headers: { "x-api-key": validApiKey },
      });

      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/visit/history/${fingerprintId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("Visit history retrieved");
      expect(Array.isArray(response.data.data.visits)).toBe(true);
      expect(response.data.data.visits.length).toBeGreaterThan(0);

      const visit = response.data.data.visits[0];
      expect(visit).toHaveProperty("fingerprintId", fingerprintId);
      expect(visit).toHaveProperty("url", "https://example.com");
      expect(visit).toHaveProperty("title", "Example Site");
    });
  });
});
