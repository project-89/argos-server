import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  cleanDatabase,
  createTestData,
} from "../utils/testUtils";

describe("Tag Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  beforeAll(async () => {
    // Initialize test environment and create test data
    await initializeTestEnvironment();
    await createTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe("POST /tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const tags = {
        visits: 5,
        timeSpent: 300,
      };

      const response = await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.tags).toEqual(tags);
    });

    it("should merge with existing tags", async () => {
      // First set initial tags
      await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {
          visits: 5,
          timeSpent: 300,
        },
      });

      // Update only one tag
      const response = await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {
          visits: 10,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({
        visits: 10,
        timeSpent: 300,
      });
    });

    it("should handle empty tags object", async () => {
      const response = await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {},
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toBeDefined();
    });

    it("should handle negative tag values", async () => {
      const response = await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {
          visits: -5,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags.visits).toBe(-5);
    });

    it("should handle non-existent fingerprint", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/update`, {
          fingerprintId: "non-existent-id",
          tags: {
            visits: 5,
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            success: false,
            error: "Fingerprint not found",
          },
        },
      });
    });

    it("should require fingerprintId", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/update`, {
          tags: { visits: 5 },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: fingerprintId",
          },
        },
      });
    });

    it("should require tags", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/update`, {
          fingerprintId: testFingerprint.id,
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: tags",
          },
        },
      });
    });

    it("should validate tag values", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/update`, {
          fingerprintId: testFingerprint.id,
          tags: {
            visits: "invalid",
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Invalid value for tag 'visits': must be a number",
          },
        },
      });
    });
  });

  describe("POST /tag/roles/update", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await makeRequest("post", `${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {
          visits: 10,
          timeSpent: 600,
        },
      });

      const tagRules = {
        visits: {
          min: 5,
          role: "premium",
        },
        timeSpent: {
          min: 300,
          role: "vip",
        },
      };

      const response = await makeRequest("post", `${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        tagRules,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("premium");
      expect(response.data.data.roles).toContain("vip");
    });

    it("should preserve existing roles", async () => {
      // First assign a role directly
      await makeRequest("post", `${API_URL}/role/assign`, {
        fingerprintId: testFingerprint.id,
        role: "admin",
      });

      // Then update roles based on tags
      const response = await makeRequest("post", `${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        tagRules: {
          visits: {
            min: 5,
            role: "premium",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("admin"); // Original role preserved
      expect(response.data.data.roles).toContain("premium"); // New role added
    });

    it("should handle empty tagRules object", async () => {
      const response = await makeRequest("post", `${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        tagRules: {},
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data.roles)).toBe(true);
    });

    it("should handle non-existent fingerprint", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: "non-existent-id",
          tagRules: {
            visits: {
              min: 5,
              role: "premium",
            },
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            success: false,
            error: "Fingerprint not found",
          },
        },
      });
    });

    it("should require fingerprintId", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/roles/update`, {
          tagRules: {
            visits: {
              min: 5,
              role: "premium",
            },
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: fingerprintId",
          },
        },
      });
    });

    it("should require tagRules", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: testFingerprint.id,
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Missing required field: tagRules",
          },
        },
      });
    });

    it("should validate tag rule format", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: testFingerprint.id,
          tagRules: {
            visits: {
              min: "invalid",
              role: "premium",
            },
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Invalid min value for tag 'visits': must be a number",
          },
        },
      });
    });

    it("should validate role names", async () => {
      await expect(
        makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: testFingerprint.id,
          tagRules: {
            visits: {
              min: 5,
              role: "invalid-role",
            },
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Invalid role: invalid-role",
          },
        },
      });
    });
  });
});
