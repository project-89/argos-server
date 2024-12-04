import axios from "axios";
import { createTestData } from "./testUtils";
import { TEST_CONFIG } from "./testConfig";
import { describe, it, expect, beforeAll } from "@jest/globals";

describe("Role Management Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let fingerprintId: string;
  let apiKey: string;

  beforeAll(async () => {
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    apiKey = testData.apiKey;
  });

  describe("POST /role", () => {
    it("should assign a new role to a fingerprint", async () => {
      const response = await axios.post(
        `${API_URL}/role`,
        {
          fingerprintId,
          role: "agent-initiate",
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
    });

    it("should return 400 for missing fields", async () => {
      await expect(
        axios.post(
          `${API_URL}/role`,
          {
            // Missing required fields
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

  describe("GET /roles", () => {
    it("should return list of available roles", async () => {
      const response = await axios.get(`${API_URL}/roles`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.roles)).toBe(true);
      expect(response.data.roles).toContain("user");
      expect(response.data.roles).toContain("agent-initiate");
    });
  });

  describe("DELETE /role", () => {
    it("should remove a role from a fingerprint", async () => {
      // First assign a role
      await axios.post(
        `${API_URL}/role`,
        {
          fingerprintId,
          role: "agent-initiate",
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      // Then remove it
      const response = await axios.delete(`${API_URL}/role`, {
        data: {
          fingerprintId,
          role: "agent-initiate",
        },
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.roles).not.toContain("agent-initiate");
    });

    it("should not allow removing the user role", async () => {
      await expect(
        axios.delete(`${API_URL}/role`, {
          data: {
            fingerprintId,
            role: "user",
          },
          headers: {
            "x-api-key": apiKey,
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 500,
          data: expect.objectContaining({
            error: expect.stringContaining("Cannot remove the 'user' role"),
          }),
        },
      });
    });
  });
});
