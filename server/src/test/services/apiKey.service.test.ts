import { describe, it, expect, beforeEach } from "@jest/globals";
import { cleanDatabase } from "../utils/testUtils";
import {
  createApiKey,
  getApiKeyByKey,
  validateApiKey,
  deactivateApiKey,
} from "../../services/apiKey.service";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../../constants";

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
        ERROR_MESSAGES.FINGERPRINT_NOT_FOUND,
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
      await deactivateApiKey({ fingerprintId, keyId: created.id });

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
      await deactivateApiKey({ fingerprintId, keyId: created.id });

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

      await deactivateApiKey({ fingerprintId, keyId: created.id });

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
      await expect(
        deactivateApiKey({ fingerprintId: "test-fingerprint", keyId: "non-existent-id" }),
      ).rejects.toThrow(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should throw error when fingerprint doesn't match", async () => {
      const fingerprintId = "test-fingerprint";
      await createTestFingerprint(fingerprintId);
      const created = await createApiKey(fingerprintId);

      await expect(
        deactivateApiKey({ fingerprintId: "different-fingerprint", keyId: created.id }),
      ).rejects.toThrow(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    });
  });
});
