import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Impression Endpoint", () => {
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const testData = await createTestData();
    validApiKey = testData.apiKey;
    fingerprintId = testData.fingerprintId;
  });

  describe("POST /impressions", () => {
    it("should create an impression", async () => {
      const impressionData = {
        fingerprintId,
        type: "form_submission",
        data: {
          formId: "contact-form",
          fields: ["name", "email"],
        },
      };

      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: impressionData,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");

      // Wait for the impression to be saved
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: {
          fingerprintId,
          type: "form_submission",
          data: {
            formId: "contact-form",
          },
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should validate impression data", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: {
          // Missing required fields
          data: {
            formId: "contact-form",
          },
        },
        headers: {
          "x-api-key": validApiKey,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
    });
  });

  describe("GET /impressions/:fingerprintId", () => {
    it("should get impressions for fingerprint", async () => {
      // Create test impression first
      const impressionData = {
        fingerprintId,
        type: "form_submission",
        data: {
          formId: "contact-form",
        },
      };

      const createResponse = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: impressionData,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(createResponse.status).toBe(201);

      // Wait for the impression to be saved
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    it("should filter impressions by type", async () => {
      // Create test impressions
      const formSubmission = {
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
      };

      const pageView = {
        fingerprintId,
        type: "page_view",
        data: { path: "/home" },
      };

      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: formSubmission,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/impressions`,
        data: pageView,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}?type=form_submission`,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.every((imp: any) => imp.type === "form_submission")).toBe(true);
    });

    it("should require API key for retrieval", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}`,
        headers: {},
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should validate fingerprint ownership", async () => {
      // Create another test fingerprint and API key with a different fingerprint
      const otherTestData = await createTestData({ skipCleanup: true });
      const { apiKey: otherApiKey } = otherTestData;

      // Test with invalid API key - should return 401
      const invalidResponse = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": "invalid-key",
        },
        validateStatus: () => true,
      });

      expect(invalidResponse.status).toBe(401);
      expect(invalidResponse.data.success).toBe(false);
      expect(invalidResponse.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);

      // Test with API key from a different fingerprint - should return 401 for GET requests
      const mismatchResponse = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": otherApiKey,
        },
        validateStatus: () => true,
      });

      expect(mismatchResponse.status).toBe(401);
      expect(mismatchResponse.data.success).toBe(false);
      expect(mismatchResponse.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);

      // Test with correct API key - should return 200
      const validResponse = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": validApiKey,
        },
        validateStatus: () => true,
      });

      expect(validResponse.status).toBe(200);
      expect(validResponse.data.success).toBe(true);
    });
  });
});
