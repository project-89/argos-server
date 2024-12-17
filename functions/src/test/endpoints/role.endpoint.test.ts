import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";

describe("Role Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /role/assign", () => {
    it("should assign a role to a fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/role/assign`,
        {
          fingerprintId,
          role: "premium",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("role", "premium");
      expect(response.data.data.roles).toContain("user");
      expect(response.data.data.roles).toContain("premium");
    });

    it("should validate required fields", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/role/assign`,
        {
          fingerprintId,
          // missing role
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: role");
    });

    it("should validate role value", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/role/assign`,
        {
          fingerprintId,
          role: "invalid-role",
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid role");
    });
  });

  describe("POST /role/remove", () => {
    it("should remove a role from a fingerprint", async () => {
      // First assign a role
      await makeRequest(
        "post",
        `${API_URL}/role/assign`,
        {
          fingerprintId,
          role: "premium",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const response = await makeRequest(
        "post",
        `${API_URL}/role/remove`,
        {
          fingerprintId,
          role: "premium",
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", fingerprintId);
      expect(response.data.data).toHaveProperty("role", "premium");
      expect(response.data.data.roles).toContain("user");
      expect(response.data.data.roles).not.toContain("premium");
    });

    it("should validate required fields", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/role/remove`,
        {
          fingerprintId,
          // missing role
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: role");
    });

    it("should not allow removing user role", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/role/remove`,
        {
          fingerprintId,
          role: "user",
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Cannot remove user role");
    });
  });

  describe("GET /role/available", () => {
    it("should return list of available roles", async () => {
      const response = await makeRequest("get", `${API_URL}/role/available`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data).toContain("user");
      expect(response.data.data).toContain("premium");
    });
  });
});
