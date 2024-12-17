import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import {
  makeRequest,
  initializeTestEnvironment,
  cleanDatabase,
  createTestData,
} from "../utils/testUtils";

describe("Tag Endpoint", () => {
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

  describe("POST /tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const tags = {
        visits: 5,
        timeSpent: 300,
      };

      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags,
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.tags).toEqual(tags);
    });

    it("should merge with existing tags", async () => {
      // First set initial tags
      await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: 5,
            timeSpent: 300,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      // Update only one tag
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: 10,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({
        visits: 10,
        timeSpent: 300,
      });
    });

    it("should handle empty tags object", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {},
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toBeDefined();
    });

    it("should handle negative tag values", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: -5,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags.visits).toBe(-5);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId: "non-existent-id",
          tags: {
            visits: 5,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
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
        `${API_URL}/tag/update`,
        {
          tags: { visits: 5 },
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprintId");
    });

    it("should require tags", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: tags");
    });

    it("should validate tag values", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: "invalid",
          },
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid value for tag 'visits': must be a number");
    });
  });

  describe("POST /tag/roles/update", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: 10,
            timeSpent: 400,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
            timeSpent: {
              min: 300,
              role: "agent-field",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("agent-initiate");
      expect(response.data.data.roles).toContain("agent-field");
    });

    it("should preserve existing roles while adding new ones", async () => {
      // First set some tags and get agent-initiate role
      await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: 10,
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      // Add agent-initiate role
      await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      // Now try to add agent-field role based on timeSpent
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            timeSpent: {
              min: 300,
              role: "agent-field",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.roles).toContain("agent-initiate"); // Previous role preserved
      expect(response.data.data.roles).not.toContain("agent-field"); // Role not added (timeSpent < 300)
    });

    it("should handle empty tagRules object", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {},
        },
        {
          headers: { "x-api-key": validApiKey },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data.roles)).toBe(true);
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId: "non-existent-id",
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
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
        `${API_URL}/tag/roles/update`,
        {
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprintId");
    });

    it("should require tagRules", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: tagRules");
    });

    it("should validate tag rule format", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: "invalid",
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid min value for tag 'visits': must be a number");
    });

    it("should validate role names", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "invalid-role",
            },
          },
        },
        {
          headers: { "x-api-key": validApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid role: invalid-role");
    });

    it("should reject request without API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should reject request with invalid API key", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": "invalid-key" },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint with a different API key
      const { apiKey: otherApiKey } = await createTestData();

      const response = await makeRequest(
        "post",
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: { "x-api-key": otherApiKey },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });
});
