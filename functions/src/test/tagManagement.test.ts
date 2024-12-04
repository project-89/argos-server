import axios from "axios";
import { TEST_CONFIG } from "./testConfig";
import { createTestData } from "./testUtils";
import { describe, it, expect } from "@jest/globals";

describe("Tag Management Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let fingerprintId: string;
  let apiKey: string;

  beforeEach(async () => {
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    apiKey = testData.apiKey;
  });

  describe("POST /tags", () => {
    it("should update tags for a fingerprint", async () => {
      const response = await axios.post(
        `${API_URL}/tags`,
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
      const fingerprintResponse = await axios.get(`${API_URL}/fingerprint/${fingerprintId}`, {
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
      await expect(
        axios.post(
          `${API_URL}/tags`,
          {
            fingerprintId, // missing tags
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining("Missing required fields"),
          }),
        },
      });
    });
  });

  describe("POST /tags/roles", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await axios.post(
        `${API_URL}/tags`,
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
        `${API_URL}/tags/roles`,
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
      await expect(
        axios.post(
          `${API_URL}/tags/roles`,
          {
            fingerprintId, // missing tagRules
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining("Missing required fields"),
          }),
        },
      });
    });
  });
});
