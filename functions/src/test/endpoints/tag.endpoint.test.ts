import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ROLE } from "../../constants/roles";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Tag Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let adminApiKey: string;
  let userApiKey: string;
  let userFingerprintId: string;

  beforeEach(async () => {
    console.log("Starting test setup...");
    await cleanDatabase();

    // Create admin user with ADMIN role
    const adminData = await createTestData({
      roles: [ROLE.ADMIN, ROLE.USER],
      metadata: {
        name: "Admin User",
        test: true,
      },
    });
    adminApiKey = adminData.apiKey;
    console.log("Created admin user with key:", { adminApiKey });

    // Create regular user with default USER role
    const userData = await createTestData({
      metadata: {
        name: "Regular User",
        test: true,
      },
    });
    userApiKey = userData.apiKey;
    userFingerprintId = userData.fingerprintId;
    console.log("Created regular user:", { userFingerprintId });

    // Wait for a short time to ensure roles are set
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Test setup complete");
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("POST /admin/tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master", "early-adopter"],
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toContain("puzzle-master");
      expect(response.data.data.tags).toContain("early-adopter");
    });

    it("should merge with existing tags", async () => {
      // First update
      await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master"],
        },
      });

      // Second update
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: ["early-adopter"],
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toContain("puzzle-master");
      expect(response.data.data.tags).toContain("early-adopter");
    });

    it("should handle empty tags array", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: [],
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_TAGS);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: "non-existent-id",
          tags: ["puzzle-master"],
        },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          tags: ["puzzle-master"],
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
    });

    it("should require tags", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_TAGS);
    });

    it("should validate tag values", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: [123],
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_TAG_TYPE);
    });

    it("should reject request from non-admin user", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/update`,
        headers: {
          "x-api-key": userApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tags: ["puzzle-master"],
        },
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.ADMIN_REQUIRED);
    });
  });

  describe("POST /admin/tag/rules", () => {
    it("should update roles based on tags", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag": {
              tags: ["puzzle-master"],
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain(ROLE.AGENT_INITIATE);
    });

    it("should preserve existing roles while adding new ones", async () => {
      // First update
      await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag-1": {
              tags: ["puzzle-master"],
              role: ROLE.AGENT_FIELD,
            },
          },
        },
      });

      // Second update
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag-2": {
              tags: ["early-adopter"],
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain(ROLE.AGENT_FIELD);
      expect(response.data.data.roles).toContain(ROLE.AGENT_INITIATE);
    });

    it("should handle empty tagRules object", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {},
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toEqual([ROLE.USER]);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: "non-existent-id",
          tagRules: {
            "test-tag": {
              tags: ["puzzle-master"],
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          tagRules: {
            "test-tag": {
              tags: ["puzzle-master"],
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_FINGERPRINT);
    });

    it("should require tagRules", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rules object is required");
    });

    it("should validate tag rule format", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag": {
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rule tags array is required");
    });

    it("should validate role names", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": adminApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag": {
              tags: ["puzzle-master"],
              role: "invalid-role",
            },
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        `Invalid enum value. Expected ${Object.values(ROLE)
          .map((r) => `'${r}'`)
          .join(" | ")}, received 'invalid-role'`,
      );
    });

    it("should reject request from non-admin user", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/admin/tag/rules`,
        headers: {
          "x-api-key": userApiKey,
        },
        data: {
          fingerprintId: userFingerprintId,
          tagRules: {
            "test-tag": {
              tags: ["puzzle-master"],
              role: ROLE.AGENT_INITIATE,
            },
          },
        },
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(ERROR_MESSAGES.ADMIN_REQUIRED);
    });
  });
});
