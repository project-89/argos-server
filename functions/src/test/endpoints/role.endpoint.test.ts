import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";

const { apiUrl: API_URL } = TEST_CONFIG;

describe("Role Endpoint", () => {
  let validApiKey: string;

  beforeEach(async () => {
    await cleanDatabase();
    const testData = await createTestData({
      roles: ["admin"],
    });
    validApiKey = testData.apiKey;

    // Wait for roles to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("POST /admin/role/assign", () => {
    it("should assign role successfully", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require admin role", async () => {
      // Create a non-admin user
      const testData = await createTestData();
      const nonAdminApiKey = testData.apiKey;

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        headers: { "x-api-key": nonAdminApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.ADMIN_REQUIRED);
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });
  });

  describe("POST /admin/role/remove", () => {
    it("should remove role successfully", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require admin role", async () => {
      // Create a non-admin user
      const testData = await createTestData();
      const nonAdminApiKey = testData.apiKey;

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        headers: { "x-api-key": nonAdminApiKey },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.ADMIN_REQUIRED);
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        data: {
          fingerprintId: "test-fingerprint",
          role: "user",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });
  });

  describe("GET /role/available", () => {
    it("should get available roles", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/role/available`,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });
});
