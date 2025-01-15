import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ROLE } from "../../constants/roles";

describe("Ownership Check Middleware Test Suite", () => {
  let validApiKey: string;
  let fingerprintId: string;
  let otherApiKey: string;
  let otherFingerprintId: string;
  let adminApiKey: string;
  let adminFingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create two regular users
    const { fingerprintId: fId1, apiKey: key1 } = await createTestData({ skipCleanup: true });
    fingerprintId = fId1;
    validApiKey = key1;

    const { fingerprintId: fId2, apiKey: key2 } = await createTestData({ skipCleanup: true });
    otherFingerprintId = fId2;
    otherApiKey = key2;

    // Create an admin user
    const { fingerprintId: adminId, apiKey: adminKey } = await createTestData({
      roles: [ROLE.ADMIN, ROLE.USER],
      skipCleanup: true,
    });
    adminFingerprintId = adminId;
    adminApiKey = adminKey;
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
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId,
        status: "online",
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

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
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
    expect(response.data.error).toBe("API key does not match fingerprint");
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

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
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
    expect(response.data.error).toBe("API key does not match fingerprint");
  });

  it("should allow admin to access other user's data via admin routes", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: otherFingerprintId,
        role: "agent-initiate",
      },
      headers: {
        "x-api-key": adminApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should deny non-admin access to admin routes even for own fingerprint", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: fingerprintId,
        role: "agent-initiate",
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Admin role required");
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

  it("should allow admin to access their own data via regular routes", async () => {
    const response = await makeRequest({
      method: "get",
      url: `${TEST_CONFIG.apiUrl}/visit/history/${adminFingerprintId}`,
      headers: {
        "x-api-key": adminApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should deny regular users access to admin's data", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/visit/presence`,
      data: {
        fingerprintId: adminFingerprintId,
        status: "online",
      },
      headers: {
        "x-api-key": validApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
  });
});
