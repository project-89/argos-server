import { describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Tag Endpoint", () => {
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
        tags: {},
        createdAt: new Date(),
      });
  });

  describe("POST /tag/update", () => {
    it("should update tags for a fingerprint", async () => {
      const tags = {
        visits: 10,
        timeSpent: 600,
      };

      const response = await axios.post(`${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.fingerprintId).toBe(testFingerprint.id);
      expect(response.data.data.tags).toEqual(tags);
    });

    it("should require fingerprintId and tags", async () => {
      const response = await axios.post(`${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        // Missing tags
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: tags");
    });

    it("should validate tag values", async () => {
      const response = await axios.post(`${API_URL}/tag/update`, {
        fingerprintId: testFingerprint.id,
        tags: {
          visits: "invalid", // Should be a number
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid value for tag 'visits': must be a number");
    });
  });

  describe("POST /tag/roles/update", () => {
    it("should update roles based on tags", async () => {
      // First set some tags
      await axios.post(`${API_URL}/tag/update`, {
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

      const response = await axios.post(`${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        tagRules,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.fingerprintId).toBe(testFingerprint.id);
      expect(response.data.data.roles).toContain("premium");
      expect(response.data.data.roles).toContain("vip");
      expect(response.data.data.roles).toContain("user");
    });

    it("should require fingerprintId and tagRules", async () => {
      const response = await axios.post(`${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        // Missing tagRules
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: tagRules");
    });

    it("should validate tag rule format", async () => {
      const response = await axios.post(`${API_URL}/tag/roles/update`, {
        fingerprintId: testFingerprint.id,
        tagRules: {
          visits: {
            min: "invalid", // Should be a number
            role: "premium",
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Invalid min value for tag 'visits': must be a number");
    });
  });
});
