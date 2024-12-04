import axios from "axios";
import { TEST_CONFIG } from "./testConfig";
import { describe, it, expect } from "@jest/globals";

describe("Fingerprint Management Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("POST /fingerprint", () => {
    it("should register a new fingerprint", async () => {
      const response = await axios.post(`${API_URL}/fingerprint`, {
        fingerprint: "test-fingerprint",
        metadata: {
          test: true,
          timestamp: Date.now(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.fingerprint).toHaveProperty("id");
      expect(response.data.fingerprint).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.fingerprint).toHaveProperty("roles");
      expect(response.data.fingerprint.roles).toContain("user");
    });

    it("should require fingerprint field", async () => {
      await expect(
        axios.post(`${API_URL}/fingerprint`, {
          metadata: { test: true },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: "Missing required field: fingerprint",
          },
        },
      });
    });
  });

  describe("GET /fingerprint/:id", () => {
    let fingerprintId: string;

    beforeEach(async () => {
      // Create a test fingerprint
      const response = await axios.post(`${API_URL}/fingerprint`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });
      fingerprintId = response.data.fingerprint.id;
    });

    it("should get fingerprint by ID", async () => {
      const response = await axios.get(`${API_URL}/fingerprint/${fingerprintId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.fingerprint).toHaveProperty("id", fingerprintId);
      expect(response.data.fingerprint).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.fingerprint).toHaveProperty("roles");
      expect(response.data.fingerprint.roles).toContain("user");
    });

    it("should handle non-existent fingerprint", async () => {
      await expect(axios.get(`${API_URL}/fingerprint/non-existent-id`)).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            error: "Fingerprint not found",
          },
        },
      });
    });
  });
});
