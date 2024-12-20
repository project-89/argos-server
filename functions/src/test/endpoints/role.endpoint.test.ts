import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData } from "../utils/testUtils";
import { PREDEFINED_ROLES } from "../../constants/roles";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Role Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;

    // Assign admin role to the test fingerprint
    const db = getFirestore();
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(fingerprintId)
      .update({
        roles: ["user", "admin"],
      });
  });

  describe("POST /admin/role/assign", () => {
    it("should assign a role to a fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("agent-initiate");
      expect(response.data.data.roles).toContain("user");
    });

    it("should validate required fields", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Role is required");
    });

    it("should validate role value", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId,
          role: "invalid-role",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        "Invalid enum value. Expected 'user' | 'agent-initiate' | 'agent-field' | 'agent-senior' | 'agent-master' | 'admin', received 'invalid-role'",
      );
    });

    it("should reject request from non-admin user", async () => {
      // Create a new fingerprint without admin role
      const { apiKey: nonAdminKey, fingerprintId: targetId } = await createTestData();

      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId: targetId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": nonAdminKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });

  describe("POST /admin/role/remove", () => {
    it("should remove a role from a fingerprint", async () => {
      // First assign a role
      await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      // Then remove it
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/remove`,
        {
          fingerprintId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).not.toContain("agent-initiate");
      expect(response.data.data.roles).toContain("user");
    });

    it("should validate required fields", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/remove`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Role is required");
    });

    it("should not allow removing user role", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/remove`,
        {
          fingerprintId,
          role: "user",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Cannot remove user role");
    });

    it("should reject request from non-admin user", async () => {
      // Create a new fingerprint without admin role
      const { apiKey: nonAdminKey, fingerprintId: targetId } = await createTestData();

      const response = await makeRequest(
        "post",
        `${API_URL}/admin/role/remove`,
        {
          fingerprintId: targetId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": nonAdminKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });

  describe("GET /role/available", () => {
    it("should return list of available roles", async () => {
      const response = await makeRequest("get", `${API_URL}/role/available`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data).toEqual(expect.arrayContaining([...PREDEFINED_ROLES]));
    });
  });
});
