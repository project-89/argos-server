import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore } from "firebase-admin/firestore";
import { tagUser, isUserIt, getTagHistory } from "../../services/tagService";
import { ERROR_MESSAGES } from "../../constants/api";
import { ApiError } from "../../utils/error";
import { cleanDatabase } from "../utils/testUtils";
import { COLLECTIONS } from "../../constants/collections";

describe("Tag Service", () => {
  const testTaggerId = "test-tagger-fingerprint";
  const testTargetId = "test-target-fingerprint";
  const nonExistentId = "non-existent-fingerprint";

  beforeEach(async () => {
    await cleanDatabase();
    // Set up test fingerprints
    const db = getFirestore();
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTaggerId).set({ tags: [] });
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTargetId).set({ tags: [] });
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("tagUser", () => {
    it("should successfully tag a user as 'it'", async () => {
      const result = await tagUser(testTaggerId, testTargetId);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Successfully tagged user as 'it'");

      // Verify the tag was added
      const db = getFirestore();
      const targetDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(testTargetId).get();
      const targetData = targetDoc.data();

      expect(targetData?.tags).toHaveLength(1);
      expect(targetData?.tags[0].tag).toBe("it");
      expect(targetData?.tags[0].taggedBy).toBe(testTaggerId);
      expect(targetData?.tags[0].taggedAt).toBeDefined();
    });

    it("should prevent self-tagging", async () => {
      await expect(tagUser(testTaggerId, testTaggerId)).rejects.toThrow(
        new ApiError(400, ERROR_MESSAGES.CANNOT_TAG_SELF),
      );
    });

    it("should prevent tagging a user who is already it", async () => {
      // First tag
      await tagUser(testTaggerId, testTargetId);

      // Attempt to tag again
      await expect(tagUser(testTaggerId, testTargetId)).rejects.toThrow(
        new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED),
      );
    });

    it("should throw error for non-existent target", async () => {
      await expect(tagUser(testTaggerId, nonExistentId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should throw error for non-existent tagger", async () => {
      await expect(tagUser(nonExistentId, testTargetId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.TAGGER_NOT_FOUND),
      );
    });
  });

  describe("isUserIt", () => {
    it("should return true for tagged user", async () => {
      await tagUser(testTaggerId, testTargetId);
      const result = await isUserIt(testTargetId);
      expect(result).toBe(true);
    });

    it("should return false for untagged user", async () => {
      const result = await isUserIt(testTaggerId);
      expect(result).toBe(false);
    });

    it("should throw error for non-existent user", async () => {
      await expect(isUserIt(nonExistentId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });

  describe("getTagHistory", () => {
    it("should return empty array for user with no tags", async () => {
      const history = await getTagHistory(testTaggerId);
      expect(history).toEqual([]);
    });

    it("should return tag history for tagged user", async () => {
      await tagUser(testTaggerId, testTargetId);
      const history = await getTagHistory(testTargetId);

      expect(history).toHaveLength(1);
      expect(history[0].tag).toBe("it");
      expect(history[0].taggedBy).toBe(testTaggerId);
      expect(history[0].taggedAt).toBeDefined();
    });

    it("should throw error for non-existent user", async () => {
      await expect(getTagHistory(nonExistentId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });
});
