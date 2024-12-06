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

    it("should require fingerprintId", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/update`, {
          // Missing fingerprintId
          tags: { visits: 5 },
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe("Missing required field: fingerprintId");
      }
    });

    it("should require tags", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/update`, {
          fingerprintId: testFingerprint.id,
          // Missing tags
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe("Missing required field: tags");
      }
    });

    it("should validate tag values", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/update`, {
          fingerprintId: testFingerprint.id,
          tags: {
            visits: "invalid", // Should be a number
          },
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe("Invalid value for tag 'visits': must be a number");
      }
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

    it("should require fingerprintId", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/roles/update`, {
          // Missing fingerprintId
          tagRules: {
            visits: {
              min: 5,
              role: "premium",
            },
          },
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe("Missing required field: fingerprintId");
      }
    });

    it("should require tagRules", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: testFingerprint.id,
          // Missing tagRules
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe("Missing required field: tagRules");
      }
    });

    it("should validate tag rule format", async () => {
      try {
        await makeRequest("post", `${API_URL}/tag/roles/update`, {
          fingerprintId: testFingerprint.id,
          tagRules: {
            visits: {
              min: "invalid", // Should be a number
              role: "premium",
            },
          },
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe(
          "Invalid min value for tag 'visits': must be a number",
        );
      }
    });
  });
});
