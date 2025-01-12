import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import {
  verifyFingerprint,
  createImpression,
  getImpressions,
  deleteImpressions,
} from "../../services/impressionService";
import { ApiError } from "../../utils/error";
import { cleanDatabase } from "../utils/testUtils";
import { MockTimestamp } from "../utils/mockTimestamp";
import { Timestamp } from "firebase-admin/firestore";
import { toUnixMillis } from "../../utils/timestamp";

describe("Impression Service", () => {
  const db = getFirestore();
  const testFingerprintId = "test-fingerprint-id";
  const testType = "test-type";
  const testData = { key: "value" };
  const testSource = "test-source";
  const testSessionId = "test-session-id";

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("verifyFingerprint", () => {
    it("should verify existing fingerprint without authenticated id", async () => {
      // Setup
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });

      // Test
      await expect(verifyFingerprint(testFingerprintId)).resolves.not.toThrow();
    });

    it("should verify existing fingerprint with matching authenticated id", async () => {
      // Setup
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });

      // Test
      await expect(verifyFingerprint(testFingerprintId, testFingerprintId)).resolves.not.toThrow();
    });

    it("should throw error for non-existent fingerprint", async () => {
      await expect(verifyFingerprint("non-existent-id")).rejects.toThrow(ApiError);
    });

    it("should throw error for mismatched authenticated id", async () => {
      // Setup
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });

      // Test
      await expect(verifyFingerprint(testFingerprintId, "wrong-auth-id")).rejects.toThrow(ApiError);
    });
  });

  describe("createImpression", () => {
    beforeEach(async () => {
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });
    });

    it("should create impression with required fields and proper timestamp format", async () => {
      const impression = await createImpression(testFingerprintId, testType, testData);

      // Check basic fields
      expect(impression).toMatchObject({
        fingerprintId: testFingerprintId,
        type: testType,
        data: testData,
      });
      expect(impression.id).toBeDefined();

      // Verify timestamp handling
      expect(impression.createdAt).toBeInstanceOf(Timestamp);

      // Verify database storage
      const storedDoc = await db.collection(COLLECTIONS.IMPRESSIONS).doc(impression.id).get();
      const storedData = storedDoc.data();
      expect(storedData?.createdAt).toBeInstanceOf(Timestamp);
    });

    it("should create impression with optional fields", async () => {
      const impression = await createImpression(testFingerprintId, testType, testData, {
        source: testSource,
        sessionId: testSessionId,
      });

      expect(impression).toMatchObject({
        fingerprintId: testFingerprintId,
        type: testType,
        data: testData,
        source: testSource,
        sessionId: testSessionId,
      });
    });
  });

  describe("getImpressions", () => {
    beforeEach(async () => {
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });

      // Create test impressions
      await createImpression(testFingerprintId, testType, testData);
      await createImpression(testFingerprintId, "other-type", testData);
      await createImpression(testFingerprintId, testType, testData, {
        sessionId: testSessionId,
      });
    });

    it("should get all impressions for fingerprint", async () => {
      const impressions = await getImpressions(testFingerprintId);
      expect(impressions).toHaveLength(3);
    });

    it("should filter impressions by type", async () => {
      const impressions = await getImpressions(testFingerprintId, { type: testType });
      expect(impressions).toHaveLength(2);
      impressions.forEach((imp) => expect(imp.type).toBe(testType));
    });

    it("should filter impressions by session id", async () => {
      const impressions = await getImpressions(testFingerprintId, { sessionId: testSessionId });
      expect(impressions).toHaveLength(1);
      expect(impressions[0].sessionId).toBe(testSessionId);
    });

    it("should limit number of impressions", async () => {
      const impressions = await getImpressions(testFingerprintId, { limit: 2 });
      expect(impressions).toHaveLength(2);
    });

    it("should filter impressions by time range using unix timestamps", async () => {
      const now = Date.now();
      const impressions = await getImpressions(testFingerprintId, {
        startTime: now - 1000,
        endTime: now + 1000,
      });
      expect(impressions.length).toBeGreaterThan(0);

      impressions.forEach((impression) => {
        const unixTime = toUnixMillis(impression.createdAt);
        expect(unixTime).toBeGreaterThanOrEqual(now - 1000);
        expect(unixTime).toBeLessThanOrEqual(now + 1000);
      });
    });

    it("should return impressions with proper timestamp format", async () => {
      const impressions = await getImpressions(testFingerprintId);
      expect(impressions).toHaveLength(3);

      impressions.forEach((impression) => {
        // Verify timestamp format in storage
        expect(impression.createdAt).toBeInstanceOf(Timestamp);
      });
    });
  });

  describe("deleteImpressions", () => {
    beforeEach(async () => {
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(testFingerprintId)
        .set({
          id: testFingerprintId,
          fingerprint: "test-fingerprint",
          roles: [],
          tags: [],
          metadata: {},
          ipAddresses: [],
          createdAt: new MockTimestamp(),
          ipMetadata: {
            ipFrequency: {},
            lastSeenAt: {},
            suspiciousIps: [],
          },
        });

      // Create test impressions
      await createImpression(testFingerprintId, testType, testData);
      await createImpression(testFingerprintId, "other-type", testData);
      await createImpression(testFingerprintId, testType, testData, {
        sessionId: testSessionId,
      });
    });

    it("should delete all impressions for fingerprint", async () => {
      const deletedCount = await deleteImpressions(testFingerprintId);
      expect(deletedCount).toBe(3);

      const remaining = await getImpressions(testFingerprintId);
      expect(remaining).toHaveLength(0);
    });

    it("should delete impressions by type", async () => {
      const deletedCount = await deleteImpressions(testFingerprintId, { type: testType });
      expect(deletedCount).toBe(2);

      const remaining = await getImpressions(testFingerprintId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].type).toBe("other-type");
    });

    it("should delete impressions by session id", async () => {
      const deletedCount = await deleteImpressions(testFingerprintId, { sessionId: testSessionId });
      expect(deletedCount).toBe(1);

      const remaining = await getImpressions(testFingerprintId);
      expect(remaining).toHaveLength(2);
      remaining.forEach((imp) => expect(imp.sessionId).not.toBe(testSessionId));
    });

    it("should delete impressions by time range", async () => {
      const now = Date.now();
      const deletedCount = await deleteImpressions(testFingerprintId, {
        startTime: now - 1000,
        endTime: now + 1000,
      });
      expect(deletedCount).toBeGreaterThan(0);

      const remaining = await getImpressions(testFingerprintId);
      expect(remaining).toHaveLength(0);
    });
  });
});
