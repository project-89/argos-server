import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

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

  describe("POST /visit/presence", () => {
    it("should record presence successfully", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId,
          url: "https://example.com",
          title: "Example Page",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId,
          url: "https://example.com",
          title: "Example Page",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          url: "https://example.com",
          title: "Example Page",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
    });

    it("should require url", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId,
          title: "Example Page",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_URL);
    });

    it("should require title", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId,
          url: "https://example.com",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_TITLE);
    });

    it("should validate url format", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId,
          url: "invalid-url",
          title: "Example Page",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_URL);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/visit/presence`,
        data: {
          fingerprintId: "non-existent",
          url: "https://example.com",
          title: "Example Page",
        },
        headers: { "x-api-key": validApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    });
  });
});
