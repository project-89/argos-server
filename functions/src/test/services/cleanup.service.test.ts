import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { cleanDatabase } from "../utils/testUtils";
import { getCurrentUnixMillis } from "../../utils/timestamp";
import {
  cleanupService,
  cleanupRateLimits,
  analyzeVisitPatterns,
} from "../../services/cleanup.service";

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
}));

describe("Cleanup Service", () => {
  const db = getFirestore();
  const mockNow = 1704067200000; // 2024-01-01T00:00:00.000Z
  const mockThirtyDaysAgo = mockNow - 30 * 24 * 60 * 60 * 1000;
  const mockOneHourAgo = mockNow - 60 * 60 * 1000;
  const testFingerprint = "test-fingerprint";

  beforeEach(async () => {
    await cleanDatabase();
    (getCurrentUnixMillis as jest.Mock).mockReturnValue(mockNow);
  });

  afterEach(async () => {
    await cleanDatabase();
    jest.clearAllMocks();
  });

  describe("cleanupService", () => {
    it("should cleanup old data from all collections", async () => {
      // Setup test data
      const oldPresence = db.collection(COLLECTIONS.PRESENCE).doc("old-presence");
      const newPresence = db.collection(COLLECTIONS.PRESENCE).doc("new-presence");
      const oldPriceCache = db.collection(COLLECTIONS.PRICE_CACHE).doc("old-price");
      const newPriceCache = db.collection(COLLECTIONS.PRICE_CACHE).doc("new-price");
      const oldRateLimitStats = db.collection(COLLECTIONS.RATE_LIMIT_STATS).doc("old-stats");
      const newRateLimitStats = db.collection(COLLECTIONS.RATE_LIMIT_STATS).doc("new-stats");
      const oldRateLimitRequests = db.collection(COLLECTIONS.RATE_LIMITS).doc("old-requests");
      const newRateLimitRequests = db.collection(COLLECTIONS.RATE_LIMITS).doc("new-requests");

      // Add old data (should be cleaned up)
      await oldPresence.set({ lastUpdated: mockThirtyDaysAgo - 1000 });
      await oldPriceCache.set({ timestamp: mockThirtyDaysAgo - 1000 });
      await oldRateLimitStats.set({ timestamp: mockThirtyDaysAgo - 1000 });
      await oldRateLimitRequests.set({ lastUpdated: mockOneHourAgo - 1000 });

      // Add new data (should not be cleaned up)
      await newPresence.set({ lastUpdated: mockNow });
      await newPriceCache.set({ timestamp: mockNow });
      await newRateLimitStats.set({ timestamp: mockNow });
      await newRateLimitRequests.set({ lastUpdated: mockNow });

      // Run cleanup
      const result = await cleanupService();

      // Verify old data was cleaned up
      expect((await oldPresence.get()).exists).toBe(false);
      expect((await oldPriceCache.get()).exists).toBe(false);
      expect((await oldRateLimitStats.get()).exists).toBe(false);
      expect((await oldRateLimitRequests.get()).exists).toBe(false);

      // Verify new data was not cleaned up
      expect((await newPresence.get()).exists).toBe(true);
      expect((await newPriceCache.get()).exists).toBe(true);
      expect((await newRateLimitStats.get()).exists).toBe(true);
      expect((await newRateLimitRequests.get()).exists).toBe(true);

      // Verify cleanup result
      expect(result.cleanupTime).toBe(mockNow);
      expect(result.itemsCleaned.presence).toBe(1);
      expect(result.itemsCleaned.priceCache).toBe(1);
      expect(result.itemsCleaned.rateLimitStats).toBe(1);
      expect(result.itemsCleaned.rateLimitRequests).toBe(1);
    });
  });

  describe("cleanupRateLimits", () => {
    it("should cleanup old rate limit requests for an identifier", async () => {
      const identifier = "test-identifier";
      const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(identifier);

      // Setup test data with mix of old and new requests
      await rateLimitRef.set({
        requests: [
          mockOneHourAgo - 1000, // Old request
          mockOneHourAgo + 1000, // Recent request
          mockNow, // Current request
        ],
        lastUpdated: mockOneHourAgo,
      });

      // Run cleanup
      await cleanupRateLimits(identifier);

      // Verify result
      const doc = await rateLimitRef.get();
      const data = doc.data();
      expect(data?.requests).toHaveLength(2);
      expect(data?.requests).toContain(mockOneHourAgo + 1000);
      expect(data?.requests).toContain(mockNow);
      expect(data?.lastUpdated).toBe(mockNow);
    });

    it("should handle non-existent rate limit documents", async () => {
      const identifier = "non-existent";
      await expect(cleanupRateLimits(identifier)).resolves.not.toThrow();
    });
  });

  describe("analyzeVisitPatterns", () => {
    it("should analyze visit patterns and engagement metrics", async () => {
      // Setup test visit data
      const visits = [
        {
          fingerprintId: testFingerprint,
          siteId: "site-1",
          timestamp: mockNow - 3000,
        },
        {
          fingerprintId: testFingerprint,
          siteId: "site-2",
          timestamp: mockNow - 2000,
        },
        {
          fingerprintId: testFingerprint,
          siteId: "site-1",
          timestamp: mockNow - 1000,
        },
        {
          fingerprintId: testFingerprint,
          siteId: "site-2",
          timestamp: mockNow,
        },
      ];

      // Add visits to database
      for (const visit of visits) {
        await db.collection(COLLECTIONS.VISITS).add(visit);
      }

      // Analyze patterns
      const result = await analyzeVisitPatterns(testFingerprint);

      // Verify patterns
      expect(result.patterns).toHaveLength(2); // site1->site2 (count: 2), site2->site1 (count: 1)
      expect(result.patterns[0]).toMatchObject({
        currentSite: "site-1",
        nextSite: "site-2",
        transitionCount: 2,
        averageTimeSpent: expect.any(Number),
      });
      expect(result.patterns[1]).toMatchObject({
        currentSite: "site-2",
        nextSite: "site-1",
        transitionCount: 1,
        averageTimeSpent: expect.any(Number),
      });

      // Verify engagement metrics
      expect(result.engagement).toHaveLength(2); // site-1 and site-2
      expect(result.engagement[0]).toMatchObject({
        siteId: expect.any(String),
        totalVisits: expect.any(Number),
        averageTimeSpent: expect.any(Number),
        returnRate: expect.any(Number),
        commonNextSites: expect.any(Array),
      });
    });

    it("should handle fingerprints with no visits", async () => {
      const result = await analyzeVisitPatterns("no-visits");
      expect(result.patterns).toHaveLength(0);
      expect(result.engagement).toHaveLength(0);
    });
  });
});
