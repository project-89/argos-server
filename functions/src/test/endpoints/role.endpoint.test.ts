import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ERROR_MESSAGES } from "../../constants/api";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ROLE } from "../../constants/roles";

const { apiUrl: API_URL } = TEST_CONFIG;

describe("Role Endpoint", () => {
  let adminApiKey: string;
  let targetFingerprintId: string;
  let adminFingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create admin user first
    const adminData = await createTestData({
      roles: [ROLE.ADMIN],
      skipCleanup: true,
    });
    adminApiKey = adminData.apiKey;
    adminFingerprintId = adminData.fingerprintId;

    // Verify admin role was set
    const db = getFirestore();
    const adminDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(adminFingerprintId).get();
    const adminRoles = adminDoc.data()?.roles || [];
    console.log("Admin roles:", adminRoles);
    expect(adminRoles).toContain(ROLE.ADMIN);

    // Create a target user to assign/remove roles
    const targetData = await createTestData({
      skipCleanup: true,
    });
    targetFingerprintId = targetData.fingerprintId;

    // Wait for roles to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  describe("POST /admin/role/assign", () => {
    it("should assign role successfully with admin API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        validateStatus: () => true,
      });

      console.log("Response:", response.data);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", targetFingerprintId);
      expect(response.data.data.roles).toContain(ROLE.AGENT_INITIATE);
    });

    it("should require admin role", async () => {
      // Create a non-admin user
      const { apiKey: nonAdminApiKey } = await createTestData({
        skipCleanup: true,
      });

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
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
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should reject invalid API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        headers: { "x-api-key": "invalid-key" },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
    });
  });

  describe("POST /admin/role/remove", () => {
    it("should remove role successfully with admin API key", async () => {
      // First assign a role
      await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/assign`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
      });

      // Then remove it
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", targetFingerprintId);
      expect(response.data.data.roles).not.toContain(ROLE.AGENT_INITIATE);
      expect(response.data.data.roles).toContain(ROLE.USER); // Should always have user role
    });

    it("should require admin role", async () => {
      // Create a non-admin user
      const { apiKey: nonAdminApiKey } = await createTestData({
        skipCleanup: true,
      });

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
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
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
    });

    it("should reject invalid API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/role/remove`,
        data: {
          fingerprintId: targetFingerprintId,
          role: ROLE.AGENT_INITIATE,
        },
        headers: { "x-api-key": "invalid-key" },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
    });
  });

  describe("GET /role/available", () => {
    it("should get available roles without requiring auth", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/role/available`,
        validateStatus: () => true,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data).toContain(ROLE.USER);
      expect(response.data.data).toContain(ROLE.ADMIN);
    });
  });
});
