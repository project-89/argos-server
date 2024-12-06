import { describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Fingerprint Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  const testFingerprint = TEST_CONFIG.testFingerprint;

  beforeEach(async () => {
    // Clear existing fingerprints
    const db = getFirestore();
    const fingerprintsSnapshot = await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .where("fingerprint", "==", testFingerprint.fingerprint)
      .get();

    const batch = db.batch();
    fingerprintsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  });

  describe("POST /fingerprint/register", () => {
    it("should register a new fingerprint", async () => {
      const response = await axios.post(`${API_URL}/fingerprint/register`, {
        fingerprint: testFingerprint.fingerprint,
        metadata: { test: true },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", testFingerprint.fingerprint);
      expect(response.data.data).toHaveProperty("metadata.test", true);
      expect(response.data.data).toHaveProperty("roles");
      expect(response.data.data.roles).toContain("user");
    });

    it("should require fingerprint field", async () => {
      const response = await axios.post(`${API_URL}/fingerprint/register`, {
        metadata: { test: true },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprint");
    });
  });

  describe("GET /fingerprint/:id", () => {
    it("should get fingerprint by ID", async () => {
      // First register a fingerprint
      const registerResponse = await axios.post(`${API_URL}/fingerprint/register`, {
        fingerprint: testFingerprint.fingerprint,
        metadata: { test: true },
      });

      const fingerprintId = registerResponse.data.data.id;

      const response = await axios.get(`${API_URL}/fingerprint/${fingerprintId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", fingerprintId);
      expect(response.data.data).toHaveProperty("fingerprint", testFingerprint.fingerprint);
      expect(response.data.data).toHaveProperty("metadata.test", true);
      expect(response.data.data).toHaveProperty("roles");
      expect(response.data.data.roles).toContain("user");
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await axios.get(`${API_URL}/fingerprint/non-existent-id`);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should handle missing ID parameter", async () => {
      try {
        await axios.get(`${API_URL}/fingerprint/`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toBe("Cannot GET /fingerprint/");
      }
    });
  });
});
