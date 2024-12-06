import { describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Role Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  beforeEach(async () => {
    // Setup test fingerprint
    const db = getFirestore();
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprint.id)
      .set({
        fingerprint: testFingerprint.fingerprint,
        roles: ["user"],
        createdAt: new Date(),
      });
  });

  describe("POST /role/assign", () => {
    it("should assign a role to a fingerprint", async () => {
      const response = await axios.post(`${API_URL}/role/assign`, {
        fingerprintId: testFingerprint.id,
        role: "premium",
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("role", "premium");
      expect(response.data.data.roles).toContain("user");
      expect(response.data.data.roles).toContain("premium");
    });

    it("should validate required fields", async () => {
      const response = await axios.post(`${API_URL}/role/assign`, {
        fingerprintId: testFingerprint.id,
        // missing role
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: role");
    });

    it("should validate role value", async () => {
      const response = await axios.post(`${API_URL}/role/assign`, {
        fingerprintId: testFingerprint.id,
        role: "invalid-role",
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid role");
    });
  });

  describe("POST /role/remove", () => {
    it("should remove a role from a fingerprint", async () => {
      // First assign a role
      await axios.post(`${API_URL}/role/assign`, {
        fingerprintId: testFingerprint.id,
        role: "premium",
      });

      const response = await axios.post(`${API_URL}/role/remove`, {
        fingerprintId: testFingerprint.id,
        role: "premium",
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("fingerprintId", testFingerprint.id);
      expect(response.data.data).toHaveProperty("role", "premium");
      expect(response.data.data.roles).toContain("user");
      expect(response.data.data.roles).not.toContain("premium");
    });

    it("should validate required fields", async () => {
      const response = await axios.post(`${API_URL}/role/remove`, {
        fingerprintId: testFingerprint.id,
        // missing role
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: role");
    });

    it("should not allow removing user role", async () => {
      const response = await axios.post(`${API_URL}/role/remove`, {
        fingerprintId: testFingerprint.id,
        role: "user",
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Cannot remove user role");
    });
  });

  describe("GET /role/available", () => {
    it("should return list of available roles", async () => {
      const response = await axios.get(`${API_URL}/role/available`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data).toContain("user");
      expect(response.data.data).toContain("premium");
    });
  });
});
