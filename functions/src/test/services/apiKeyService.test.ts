import { describe, it, expect, beforeEach } from "@jest/globals";
import { cleanDatabase } from "../utils/testUtils";
import {
  createApiKey,
  getApiKeyByKey,
  getApiKeys,
  validateApiKey,
  deactivateApiKey,
  revokeApiKey,
} from "../../services/apiKeyService";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";

const db = getFirestore();

async function createTestFingerprint(fingerprintId: string) {
  await db
    .collection(COLLECTIONS.FINGERPRINTS)
    .doc(fingerprintId)
    .set({
      id: fingerprintId,
      createdAt: Date.now(),
      lastVisited: Date.now(),
      roles: ["USER"],
      tags: [],
    });
}

describe("API Key Service", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("createApiKey", () => {
    it("should create a new API key for registered fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const result = await createApiKey(fingerprintId);

      expect(result).toEqual({
        id: expect.any(String),
        key: expect.any(String),
        fingerprintId,
        active: true,
        createdAt: expect.any(Number),
      });
    });

    it("should deactivate existing active key when creating a new one", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);

      // Create first API key
      const firstKey = await createApiKey(fingerprintId);

      // Create second API key
      const secondKey = await createApiKey(fingerprintId);

      // Check that first key is now inactive
      const firstKeyResult = await getApiKeyByKey(firstKey.key);
      expect(firstKeyResult).toEqual({
        id: firstKey.id,
        key: firstKey.key,
        fingerprintId,
        active: false,
        createdAt: expect.any(Number),
      });

      // Check that second key is active
      const secondKeyResult = await getApiKeyByKey(secondKey.key);
      expect(secondKeyResult).toEqual({
        id: secondKey.id,
        key: secondKey.key,
        fingerprintId,
        active: true,
        createdAt: expect.any(Number),
      });
    });

    it("should throw error for unregistered fingerprint", async () => {
      await expect(createApiKey("unregistered-fingerprint")).rejects.toThrow(
        "Fingerprint not found",
      );
    });
  });

  describe("getApiKeyByKey", () => {
    it("should retrieve an API key by its key string", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      const result = await getApiKeyByKey(created.key);
      expect(result).toEqual({
        id: expect.any(String),
        key: created.key,
        fingerprintId,
        active: true,
        createdAt: expect.any(Number),
      });
    });

    it("should return null for non-existent key", async () => {
      const result = await getApiKeyByKey("non-existent-key");
      expect(result).toBeNull();
    });

    it("should return inactive key", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);
      await deactivateApiKey(fingerprintId, created.id);

      const result = await getApiKeyByKey(created.key);
      expect(result).toEqual({
        id: expect.any(String),
        key: created.key,
        fingerprintId,
        active: false,
        createdAt: expect.any(Number),
      });
    });
  });

  describe("getApiKeys", () => {
    it("should retrieve all API keys for a fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);

      // Create first key (will be deactivated)
      await createApiKey(fingerprintId);
      // Create second key (will be active)
      const activeKey = await createApiKey(fingerprintId);

      const results = await getApiKeys(fingerprintId);
      expect(results).toHaveLength(2);

      // One key should be active, one inactive
      const activeKeys = results.filter((key) => key.active);
      const inactiveKeys = results.filter((key) => !key.active);

      expect(activeKeys).toHaveLength(1);
      expect(inactiveKeys).toHaveLength(1);

      expect(activeKeys[0]).toEqual({
        id: activeKey.id,
        key: activeKey.key,
        fingerprintId,
        active: true,
        createdAt: expect.any(Number),
      });
    });

    it("should return empty array for fingerprint with no keys", async () => {
      const results = await getApiKeys("non-existent-fingerprint");
      expect(results).toEqual([]);
    });
  });

  describe("validateApiKey", () => {
    it("should validate an active API key", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      const result = await validateApiKey(created.key);
      expect(result).toEqual({
        isValid: true,
        needsRefresh: false,
      });
    });

    it("should indicate when a key needs refresh", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);
      await deactivateApiKey(fingerprintId, created.id);

      const result = await validateApiKey(created.key);
      expect(result).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });

    it("should handle non-existent key", async () => {
      const result = await validateApiKey("non-existent-key");
      expect(result).toEqual({
        isValid: false,
        needsRefresh: true,
      });
    });
  });

  describe("deactivateApiKey", () => {
    it("should deactivate an API key", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      await deactivateApiKey(fingerprintId, created.id);

      const result = await getApiKeyByKey(created.key);
      expect(result).toEqual({
        id: expect.any(String),
        key: created.key,
        fingerprintId,
        active: false,
        createdAt: expect.any(Number),
      });
    });

    it("should throw error for non-existent key", async () => {
      await expect(deactivateApiKey("test-fingerprint", "non-existent-id")).rejects.toThrow(
        "API key not found",
      );
    });

    it("should throw error when fingerprint doesn't match", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      await expect(deactivateApiKey("different-fingerprint", created.id)).rejects.toThrow(
        "API key does not belong to fingerprint",
      );
    });
  });

  describe("revokeApiKey", () => {
    it("should revoke an API key", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      await revokeApiKey(created.key, fingerprintId);

      const result = await getApiKeyByKey(created.key);
      expect(result).toEqual({
        id: expect.any(String),
        key: created.key,
        fingerprintId,
        active: false,
        createdAt: expect.any(Number),
      });
    });

    it("should throw error for non-existent key", async () => {
      await expect(revokeApiKey("non-existent-key", "test-fingerprint")).rejects.toThrow(
        "Invalid API key",
      );
    });

    it("should throw error when fingerprint doesn't match", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      await expect(revokeApiKey(created.key, "different-fingerprint")).rejects.toThrow(
        "Not authorized to revoke this API key",
      );
    });
  });
});
