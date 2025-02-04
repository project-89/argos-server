import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants";

describe("Ownership Check Middleware Test Suite", () => {
  let validApiKey: string;
  let fingerprintId: string;
  let otherApiKey: string;
  let otherFingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create two regular users
    const { fingerprintId: fId1, apiKey: key1 } = await createTestData({ skipCleanup: true });
    fingerprintId = fId1;
    validApiKey = key1;

    const { fingerprintId: fId2, apiKey: key2 } = await createTestData({ skipCleanup: true });
    otherFingerprintId = fId2;
    otherApiKey = key2;
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  it("should allow access to own data via URL params", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${fingerprintId}`,
      headers: {
        "x-api-key": validApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should allow access to own data via request body", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/fingerprint/update`,
      data: {
        fingerprintId,
        metadata: { test: true },
      },
      headers: {
        "x-api-key": validApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should deny access to other user's data via URL params", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${otherFingerprintId}`,
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });

  it("should deny access to other user's data via request body", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId: otherFingerprintId,
        status: "online",
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  });

  it("should deny when second user tries to access first user's data via URL params", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${fingerprintId}`,
      headers: {
        "x-api-key": otherApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });

  it("should deny when second user tries to access first user's data via request body", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId: fingerprintId,
        status: "online",
      },
      headers: {
        "x-api-key": otherApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  });

  it("should allow access to public protected routes", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/role/available`,
      headers: {
        "x-api-key": validApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should handle requests with no fingerprint specified", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/role/available`,
      headers: {
        "x-api-key": validApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should handle OPTIONS requests", async () => {
    const response = await makeRequest({
      method: "options",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${otherFingerprintId}`,
      headers: {
        "x-api-key": validApiKey,
      },
    });

    expect(response.status).toBe(204);
  });

  it("should handle malformed requests gracefully", async () => {
    // Test with malformed data but valid fingerprint ownership
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId: fingerprintId, // Use valid fingerprint that matches API key
        status: "invalid_status",
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBeTruthy();
  });

  it("should handle missing fingerprint ID gracefully", async () => {
    // Test with missing fingerprint in URL
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/`, // Missing fingerprint ID
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(404); // Should be 404 for missing resource
    expect(response.data.success).toBe(false);
  });

  it("should return 401 for GET requests when API key does not match fingerprint", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${otherFingerprintId}`,
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });

  it("should return 403 for POST requests when API key does not match fingerprint", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId: otherFingerprintId,
        status: "online",
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  });

  it("should return 403 for POST requests to /fingerprint/update when API key does not match fingerprint", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/fingerprint/update`,
      data: {
        fingerprintId: otherFingerprintId,
        metadata: { test: true },
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  });

  it("should return 403 for DELETE requests when API key does not match fingerprint", async () => {
    const response = await makeRequest({
      method: "delete",
      url: `${TEST_CONFIG.apiUrl}/impressions/${otherFingerprintId}`,
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  });
});
