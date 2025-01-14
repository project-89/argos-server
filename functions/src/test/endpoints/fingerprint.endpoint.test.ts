import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Fingerprint Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    // Create test data
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /fingerprint/register", () => {
    it("should register a new fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/register`,
        data: {
          fingerprint: "test-fingerprint",
          metadata: {
            test: true,
            name: "Test Fingerprint",
          },
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.data.metadata).toEqual({
        test: true,
        name: "Test Fingerprint",
      });
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should require fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/register`,
        data: {},
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["fingerprint"],
          message: ERROR_MESSAGES.MISSING_FINGERPRINT,
        },
      ]);
    });
  });

  describe("GET /fingerprint/:id", () => {
    it("should get fingerprint by ID", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/${fingerprintId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", fingerprintId);
      expect(response.data.data.metadata).toEqual({
        testData: true,
        name: "Test Fingerprint",
      });
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should return 401 when fingerprint for API key no longer exists", async () => {
      // Create a new fingerprint and API key
      const newFingerprintResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/register`,
        data: {
          fingerprint: "test-fingerprint-for-404",
          metadata: { test: true },
        },
      });
      const newFingerprintId = newFingerprintResponse.data.data.id;

      // Register an API key for the new fingerprint
      const newApiKeyResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/api-key/register`,
        data: {
          fingerprintId: newFingerprintId,
        },
      });
      const newApiKey = newApiKeyResponse.data.data.key;

      // Delete the fingerprint from Firestore (manual cleanup)
      await cleanDatabase();

      // Try to get the deleted fingerprint
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/${newFingerprintId}`,
        headers: { "x-api-key": newApiKey },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should return 404 for non-existent fingerprint", async () => {
      // Try to get a fingerprint that never existed
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/non-existent-id`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_FINGERPRINT);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should require fingerprint ID", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Not Found");
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/${fingerprintId}`,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should reject invalid API key", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/${fingerprintId}`,
        headers: { "x-api-key": "invalid-key" },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint and API key
      const otherFingerprintResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/register`,
        data: {
          fingerprint: "other-test-fingerprint",
          metadata: { test: true },
        },
      });
      const otherFingerprintId = otherFingerprintResponse.data.data.id;

      // Register an API key for the other fingerprint
      const otherApiKeyResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/api-key/register`,
        data: {
          fingerprintId: otherFingerprintId,
        },
      });
      const otherApiKey = otherApiKeyResponse.data.data.key;

      // Try to get the first fingerprint using the second fingerprint's API key
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/fingerprint/${fingerprintId}`,
        headers: { "x-api-key": otherApiKey },
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });
  });

  describe("POST /fingerprint/update", () => {
    it("should update fingerprint metadata", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: {
            test: true,
            name: "Updated Test Fingerprint",
            newField: "new value",
          },
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", fingerprintId);
      expect(response.data.data.metadata).toEqual({
        test: true,
        name: "Updated Test Fingerprint",
        newField: "new value",
        testData: true,
      });
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should merge metadata with existing values", async () => {
      // First update
      const firstResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: {
            test: true,
            name: "First Update",
            field1: "value1",
          },
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.data.success).toBe(true);
      expect(firstResponse.data.data.metadata).toEqual({
        test: true,
        name: "First Update",
        field1: "value1",
        testData: true,
      });
      expect(firstResponse.data.requestId).toBeTruthy();
      expect(firstResponse.data.timestamp).toBeTruthy();

      // Second update with different fields
      const secondResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: {
            field2: "value2",
          },
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.data.success).toBe(true);
      expect(secondResponse.data.data.metadata).toEqual({
        test: true,
        name: "First Update",
        field1: "value1",
        field2: "value2",
        testData: true,
      });
      expect(secondResponse.data.requestId).toBeTruthy();
      expect(secondResponse.data.timestamp).toBeTruthy();
    });

    it("should override existing metadata values", async () => {
      // First update
      const firstResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: {
            test: true,
            name: "First Update",
            field1: "value1",
          },
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.data.success).toBe(true);
      expect(firstResponse.data.data.metadata).toEqual({
        test: true,
        name: "First Update",
        field1: "value1",
        testData: true,
      });
      expect(firstResponse.data.requestId).toBeTruthy();
      expect(firstResponse.data.timestamp).toBeTruthy();

      // Second update overriding field1
      const secondResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: {
            field1: "new value",
          },
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.data.success).toBe(true);
      expect(secondResponse.data.data.metadata).toEqual({
        test: true,
        name: "First Update",
        field1: "new value",
        testData: true,
      });
      expect(secondResponse.data.requestId).toBeTruthy();
      expect(secondResponse.data.timestamp).toBeTruthy();
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {},
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["fingerprintId"],
          message: ERROR_MESSAGES.MISSING_FINGERPRINT,
        },
      ]);
    });

    it("should require metadata", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Metadata is required");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "object",
          received: "undefined",
          path: ["metadata"],
          message: "Metadata is required",
        },
      ]);
    });

    it("should validate metadata is an object", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: "not an object",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Expected object, received string");
      expect(response.data.details).toEqual([
        {
          code: "invalid_type",
          expected: "object",
          received: "string",
          path: ["metadata"],
          message: "Expected object, received string",
        },
      ]);
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: { test: true },
        },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should reject invalid API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: { test: true },
        },
        headers: { "x-api-key": "invalid-key" },
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint and API key
      const otherFingerprintResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/register`,
        data: {
          fingerprint: "other-test-fingerprint",
          metadata: { test: true },
        },
      });
      const otherFingerprintId = otherFingerprintResponse.data.data.id;

      // Register an API key for the other fingerprint
      const otherApiKeyResponse = await makeRequest({
        method: "post",
        url: `${API_URL}/api-key/register`,
        data: {
          fingerprintId: otherFingerprintId,
        },
      });
      const otherApiKey = otherApiKeyResponse.data.data.key;

      // Try to update the first fingerprint using the second fingerprint's API key
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/fingerprint/update`,
        data: {
          fingerprintId,
          metadata: { test: true },
        },
        headers: { "x-api-key": otherApiKey },
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      expect(response.data.requestId).toBeTruthy();
      expect(response.data.timestamp).toBeTruthy();
    });
  });
});
