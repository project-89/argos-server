import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  createTestData,
  cleanDatabase,
} from "../utils/testUtils";
import { PREDEFINED_ROLES } from "../../constants/roles";

describe("Tag Endpoint", () => {
  let adminApiKey: string;
  let userApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create admin user first
    const adminData = await createTestData({
      isAdmin: true,
      roles: [PREDEFINED_ROLES[0], PREDEFINED_ROLES[PREDEFINED_ROLES.length - 1]], // user and admin roles
    });
    adminApiKey = adminData.apiKey;

    // Create regular user
    const userData = await createTestData({
      roles: [PREDEFINED_ROLES[0]], // Explicitly set roles
    });
    userApiKey = userData.apiKey;
    fingerprintId = userData.fingerprintId;

    // Log the API keys being used
    console.log("Test setup - Admin API Key:", adminApiKey);
    console.log("Test setup - User API Key:", userApiKey);
  });

  describe("POST /admin/tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: ["puzzle-master", "early-adopter"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
            "Content-Type": "application/json",
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toContain("puzzle-master");
      expect(response.data.data.tags).toContain("early-adopter");
    });

    it("should merge with existing tags", async () => {
      // First add some initial tags
      await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: ["existing-tag"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      // Add new tags
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
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
      expect(response.data.data.tags).toContain("puzzle-master");
      expect(response.data.data.tags).toContain("early-adopter");
    });

    it("should handle empty tags array", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: [],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("At least one tag must be provided");
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId: "non-existent-id",
          tags: ["test-tag"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          tags: ["test-tag"],
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint ID is required");
    });

    it("should require tags", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tags array is required");
    });

    it("should validate tag values", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: [123], // Invalid: not a string
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Expected string, received number");
    });

    it("should reject request from non-admin user", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: ["test-tag"],
        },
        {
          headers: {
            "x-api-key": userApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });

  describe("POST /admin/tag/rules", () => {
    it("should update roles based on tags", async () => {
      // First add some tags
      await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
          tags: ["puzzle-master"],
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
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
          tagRules: {
            "puzzle-master": {
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
      // First add some tags
      await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/update`,
        {
          fingerprintId,
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
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
          tagRules: {
            "puzzle-master": {
              tags: ["puzzle-master"],
              role: "agent-field",
            },
            "early-adopter": {
              tags: ["early-adopter"],
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
      expect(response.data.data.roles).toContain("user");
    });

    it("should handle empty tagRules object", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
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
      expect(response.data.data.roles).toEqual([PREDEFINED_ROLES[0]]);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId: "non-existent-id",
          tagRules: {
            "test-tag": {
              tags: ["test-tag"],
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

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should require fingerprintId", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          tagRules: {
            "test-tag": ["agent-initiate"],
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint ID is required");
    });

    it("should require tagRules", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rules object is required");
    });

    it("should validate tag rule format", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
          tagRules: {
            "test-tag": {
              roles: 123, // Invalid: roles should be an array
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Tag rule tags array is required");
    });

    it("should validate role names", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
          tagRules: {
            "test-tag": {
              tags: ["test-tag"],
              role: "invalid-role", // Invalid: not a predefined role
            },
          },
        },
        {
          headers: {
            "x-api-key": adminApiKey,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        `Invalid enum value. Expected ${PREDEFINED_ROLES.map((r) => `'${r}'`).join(" | ")}, received 'invalid-role'`,
      );
    });

    it("should reject request from non-admin user", async () => {
      const response = await makeRequest(
        "post",
        `${TEST_CONFIG.apiUrl}/admin/tag/rules`,
        {
          fingerprintId,
          tagRules: {
            "test-tag": {
              roles: ["agent-initiate"],
            },
          },
        },
        {
          headers: {
            "x-api-key": userApiKey,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("admin role required");
    });
  });
});
