import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";

describe("Fingerprint Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  beforeEach(async () => {
    // Clean up any test fingerprints
    const db = getFirestore();
    const fingerprintsRef = db.collection(COLLECTIONS.FINGERPRINTS);
    const snapshot = await fingerprintsRef.where("fingerprint", "==", "test-fingerprint").get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  describe("POST /fingerprint/register", () => {
    it("should register a new fingerprint", async () => {
      const response = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
      expect(response.data.data).toHaveProperty("tags", {});
    });

    it("should require fingerprint field", async () => {
      const response = await makeRequest(
        "post",
        `${API_URL}/fingerprint/register`,
        {
          metadata: { test: true },
        },
        {
          validateStatus: () => true,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Missing required field: fingerprint");
    });
  });

  describe("GET /fingerprint/:id", () => {
    let testFingerprintId: string;

    beforeEach(async () => {
      // Register a test fingerprint
      const registerResponse = await makeRequest("post", `${API_URL}/fingerprint/register`, {
        fingerprint: "test-fingerprint",
        metadata: { test: true },
      });
      testFingerprintId = registerResponse.data.data.id;
    });

    it("should get fingerprint by ID", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/${testFingerprintId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id", testFingerprintId);
      expect(response.data.data).toHaveProperty("fingerprint", "test-fingerprint");
      expect(response.data.data).toHaveProperty("roles", ["user"]);
      expect(response.data.data).toHaveProperty("createdAt");
      expect(response.data.data).toHaveProperty("metadata");
      expect(response.data.data.metadata).toHaveProperty("test", true);
      expect(response.data.data).toHaveProperty("tags", {});
    });

    it("should handle non-existent fingerprint", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/non-existent-id`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Fingerprint not found");
    });

    it("should handle missing ID parameter", async () => {
      const response = await makeRequest("get", `${API_URL}/fingerprint/`, null, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data).toMatch(/Cannot GET \/fingerprint\//);
    });
  });
});
