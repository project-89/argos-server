import axios from "axios";
import { TEST_CONFIG, createTestData } from "./setup";
import { describe, it, expect } from "@jest/globals";

describe("Tag Management Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let fingerprintId: string;
  let apiKey: string;

  beforeEach(async () => {
    // Create test data and get API key
    const { fingerprintId: id } = await createTestData();
    fingerprintId = id;

    // Register API key
    const keyResponse = await axios.post(`${API_URL}/register-api-key`, {
      name: "test-key",
      fingerprintId,
      metadata: { test: true },
    });
    apiKey = keyResponse.data.apiKey;
  });

  describe("POST /update-tags", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await axios.post(
        `${API_URL}/update-tags`,
        {
          fingerprintId,
          tags: {
            puzzle_solved: 5,
            mission_complete: 10,
          },
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify tags were updated
      const fingerprintResponse = await axios.get(`${API_URL}/get-fingerprint/${fingerprintId}`, {
        headers: {
          "x-api-key": apiKey,
        },
      });
      expect(fingerprintResponse.data.fingerprint.tags).toEqual({
        puzzle_solved: 5,
        mission_complete: 10,
      });
    });

    it("should require fingerprintId and tags", async () => {
      try {
        await axios.post(
          `${API_URL}/update-tags`,
          {
            fingerprintId, // missing tags
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });
  });

  describe("POST /update-roles-by-tags", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await axios.post(
        `${API_URL}/update-tags`,
        {
          fingerprintId,
          tags: {
            puzzle_solved: 5,
            mission_complete: 10,
          },
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      // Then update roles based on tags
      const response = await axios.post(
        `${API_URL}/update-roles-by-tags`,
        {
          fingerprintId,
          tagRules: {
            puzzle_solved: "agent-initiate",
            mission_complete: "agent-field",
          },
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.roles).toContain("agent-initiate");
      expect(response.data.roles).toContain("agent-field");
    });

    it("should require fingerprintId and tagRules", async () => {
      try {
        await axios.post(
          `${API_URL}/update-roles-by-tags`,
          {
            fingerprintId, // missing tagRules
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });
  });
});
