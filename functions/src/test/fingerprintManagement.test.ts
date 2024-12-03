import axios from "axios";
import { TEST_CONFIG } from "./setup";
import { describe, it, expect } from "@jest/globals";

describe("Fingerprint Management Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  describe("POST /register-fingerprint", () => {
    it("should register a new fingerprint", async () => {
      const response = await axios.post(`${API_URL}/register-fingerprint`, {
        fingerprint: "test-fingerprint",
        metadata: {
          test: true,
          timestamp: Date.now(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain("Fingerprint registered with ID:");
    });

    it("should require fingerprint field", async () => {
      try {
        await axios.post(`${API_URL}/register-fingerprint`, {
          metadata: { test: true },
        });
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required field: fingerprint");
      }
    });
  });

  describe("GET /get-fingerprint/:id", () => {
    let fingerprintId: string;

    beforeEach(async () => {
      // Create a test fingerprint
      const response = await axios.post(`${API_URL}/register-fingerprint`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });
      fingerprintId = response.data.message.split(": ")[1];
    });

    it("should get fingerprint by ID", async () => {
      const response = await axios.get(`${API_URL}/get-fingerprint/${fingerprintId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.fingerprint).toHaveProperty("id", fingerprintId);
      expect(response.data.fingerprint).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.fingerprint).toHaveProperty("roles");
      expect(response.data.fingerprint.roles).toContain("user");
    });

    it("should handle non-existent fingerprint", async () => {
      try {
        await axios.get(`${API_URL}/get-fingerprint/non-existent-id`);
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe("Fingerprint not found");
      }
    });
  });
});
