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

describe("API Key Service", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("createApiKey", () => {
    it("should create a new API key", async () => {
      const fingerprintId = "test-fingerprint";
      const result = await createApiKey(fingerprintId);

      expect(result).toEqual({
        id: expect.any(String),
        key: expect.any(String),
        fingerprintId,
        active: true,
        createdAt: expect.any(Number),
      });
    });
  });

  describe("getApiKeyByKey", () => {
    it("should retrieve an API key by its key string", async () => {
      const fingerprintId = "test-fingerprint";
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

    it("should return null for inactive key", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);
      await deactivateApiKey(fingerprintId, created.id);

      const result = await getApiKeyByKey(created.key);
      expect(result).toBeNull();
    });
  });

  describe("getApiKeys", () => {
    it("should retrieve all API keys for a fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      await createApiKey(fingerprintId);
      await createApiKey(fingerprintId);

      const results = await getApiKeys(fingerprintId);
      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            key: expect.any(String),
            fingerprintId,
            active: true,
            createdAt: expect.any(Number),
          }),
        ]),
      );
    });

    it("should return empty array for fingerprint with no keys", async () => {
      const results = await getApiKeys("non-existent-fingerprint");
      expect(results).toEqual([]);
    });
  });

  describe("validateApiKey", () => {
    it("should validate an active API key", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);

      const result = await validateApiKey(created.key);
      expect(result).toEqual({
        isValid: true,
        needsRefresh: false,
        fingerprintId,
      });
    });

    it("should indicate when a key needs refresh", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);
      await deactivateApiKey(fingerprintId, created.id);

      const result = await validateApiKey(created.key);
      expect(result).toEqual({
        isValid: false,
        needsRefresh: false,
      });
    });

    it("should handle non-existent key", async () => {
      const result = await validateApiKey("non-existent-key");
      expect(result).toEqual({
        isValid: false,
        needsRefresh: false,
      });
    });
  });

  describe("deactivateApiKey", () => {
    it("should deactivate an API key", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);

      await deactivateApiKey(fingerprintId, created.id);

      const result = await getApiKeyByKey(created.key);
      expect(result).toBeNull();
    });

    it("should throw error for non-existent key", async () => {
      await expect(deactivateApiKey("test-fingerprint", "non-existent-id")).rejects.toThrow(
        "API key not found",
      );
    });

    it("should throw error when fingerprint doesn't match", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);

      await expect(deactivateApiKey("different-fingerprint", created.id)).rejects.toThrow(
        "API key does not belong to fingerprint",
      );
    });
  });

  describe("revokeApiKey", () => {
    it("should revoke an API key", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);

      await revokeApiKey(created.key, fingerprintId);

      const result = await getApiKeyByKey(created.key);
      expect(result).toBeNull();
    });

    it("should throw error for non-existent key", async () => {
      await expect(revokeApiKey("non-existent-key", "test-fingerprint")).rejects.toThrow(
        "API key not found",
      );
    });

    it("should throw error when fingerprint doesn't match", async () => {
      const fingerprintId = "test-fingerprint";
      const created = await createApiKey(fingerprintId);

      await expect(revokeApiKey(created.key, "different-fingerprint")).rejects.toThrow(
        "Not authorized to revoke this API key",
      );
    });
  });
});
