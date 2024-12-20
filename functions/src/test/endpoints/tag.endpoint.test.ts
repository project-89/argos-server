import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData } from "../utils/testUtils";

describe("Tag Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let adminApiKey: string;
  let userApiKey: string;
  let userFingerprintId: string;

  beforeEach(async () => {
    // Create admin user
    const adminData = await createTestData({ roles: ["admin"] });
    adminApiKey = adminData.apiKey;

    // Create regular user
    const userData = await createTestData({ roles: ["user"] });
    userApiKey = userData.apiKey;
    userFingerprintId = userData.fingerprintId;
  });

  describe("POST /admin/tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master", "early-adopter"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual(["puzzle-master", "early-adopter"]);
    });

    it("should merge with existing tags", async () => {
      // First update
      await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      // Second update
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["early-adopter"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual(
        expect.arrayContaining(["puzzle-master", "early-adopter"]),
      );
    });

    it("should handle empty tags array", async () => {
      try {
        await makeRequest(
          "post",
          `${API_URL}/admin/tag/update`,
          {
            fingerprintId: userFingerprintId,
            tags: [],
          },
          {
            headers: {
              "x-api-key": adminApiKey,
            },
          },
        );
        // If we reach here, the request didn't fail as expected
        fail("Expected request to fail with 400");
      } catch (error: any) {
        const response = error.response;
        expect(response.status).toBe(400);
        expect(response.data.success).toBe(false);
        expect(response.data.error).toBe("At least one tag must be provided");
      }
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: "nonexistent",
          tags: ["puzzle-master"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          tags: ["puzzle-master"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint ID is required");
    });

    it("should require tags", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tags array is required");
    });

    it("should validate tag values", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: [123],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tags must be an array of strings");
    });

    it("should reject request from non-admin user", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master"],
        },
        {
          headers: {
            "x-api-key": userApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });

  describe("POST /admin/tag/rules", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      // Then apply tag rules
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master"],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("agent-initiate");
    });

    it("should preserve existing roles while adding new ones", async () => {
      // First assign a role directly
      await makeRequest(
        "post",
        `${API_URL}/admin/role/assign`,
        {
          fingerprintId: userFingerprintId,
          role: "agent-field",
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      // Set tags
      await makeRequest(
        "post",
        `${API_URL}/admin/tag/update`,
        {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master", "early-adopter"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      // Apply tag rules
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master", "early-adopter"],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("agent-field");
      expect(response.data.data.roles).toContain("agent-initiate");
    });

    it("should handle empty tagRules object", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {},
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toEqual(["user"]);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: "nonexistent",
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master"],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master"],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint ID is required");
    });

    it("should require tagRules", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rules object is required");
    });

    it("should validate tag rule format", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {
            "puzzle-rule": {
              tags: [123],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rule tags must be an array of strings");
    });

    it("should validate role names", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master"],
              role: "invalid-role",
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
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
      const response = await makeRequest(
        "post",
        `${API_URL}/admin/tag/rules`,
        {
          fingerprintId: userFingerprintId,
          tagRules: {
            "puzzle-rule": {
              tags: ["puzzle-master"],
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": userApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });
});
