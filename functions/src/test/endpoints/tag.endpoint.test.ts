import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData } from "../utils/testUtils";

describe("Tag Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            visits: 10,
            purchases: 5,
          },
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({
        visits: 10,
        purchases: 5,
      });
    });

    it("should merge with existing tags", async () => {
      // First update
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
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      // Second update
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId,
          tags: {
            purchases: 5,
          },
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({
        visits: 10,
        purchases: 5,
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
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({});
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
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tags).toEqual({
        visits: -5,
      });
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
        {
          fingerprintId: "non-existent",
          tags: {
            visits: 10,
          },
        },
        {
          headers: {
            "x-api-key": validApiKey,
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
        `${API_URL}/tag/update`,
        {
          tags: {
            visits: 10,
          },
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
      expect(response.data.error).toBe("Fingerprint ID is required");
    });

    it("should require tags", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/tag/update`,
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
      expect(response.data.error).toBe("Tags object is required");
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
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Expected number, received string");
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
          },
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      // Then update roles based on tags
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
          headers: {
            "x-api-key": validApiKey,
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
        `${API_URL}/role/assign`,
        {
          fingerprintId,
          role: "agent-field",
        },
        {
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      // Set some tags
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
          headers: {
            "x-api-key": validApiKey,
          },
        },
      );

      // Update roles based on tags
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
          headers: {
            "x-api-key": validApiKey,
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
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId,
          tagRules: {},
        },
        {
          headers: {
            "x-api-key": validApiKey,
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
        `${API_URL}/tag/roles/update`,
        {
          fingerprintId: "non-existent",
          tagRules: {
            visits: {
              min: 5,
              role: "agent-initiate",
            },
          },
        },
        {
          headers: {
            "x-api-key": validApiKey,
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
          headers: {
            "x-api-key": validApiKey,
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
        `${API_URL}/tag/roles/update`,
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
      expect(response.data.error).toBe("Tag rules object is required");
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
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Min value must be a number");
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
          headers: {
            "x-api-key": validApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe(
        "Invalid enum value. Expected 'user' | 'agent-initiate' | 'agent-field' | 'agent-senior' | 'agent-master', received 'invalid-role'",
      );
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
          headers: {
            "x-api-key": "invalid-key",
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid API key");
    });

    it("should reject request when API key does not match fingerprint", async () => {
      // Create another fingerprint and API key
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
          headers: {
            "x-api-key": otherApiKey,
          },
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });
});
