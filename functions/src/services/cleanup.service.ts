import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

// Constants for cleanup thresholds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CleanupResult {
  priceCache: number;
  rateLimitStats: number;
  rateLimitRequests: number;
  deletedVisits: number;
  deletedPresence: number;
  disabledApiKeys: number;
  deletedApiKeys: number;
  total: number;
  cleanupTime: number;
  itemsCleaned: {
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
    visits: number;
    presence: number;
    disabledApiKeys: number;
    deletedApiKeys: number;
  };
}

interface VisitData {
  id: string;
  fingerprintId: string;
  siteId: string;
  timestamp: number;
  url: string;
  title?: string;
}

interface VisitPattern {
  currentSite: string;
  nextSite: string;
  transitionCount: number;
  averageTimeSpent: number;
}

interface SiteEngagement {
  siteId: string;
  totalVisits: number;
  averageTimeSpent: number;
  returnRate: number; // percentage of users who return
  commonNextSites: string[]; // top 3 next sites visited
}

export const cleanupData = async (shouldError = false): Promise<CleanupResult> => {
  try {
    const startTime = Date.now();
    // If shouldError is true, throw an error for testing
    if (shouldError) {
      throw new Error("Simulated error for testing");
    }

    const db = getFirestore();
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;
    const oneDayAgo = now - ONE_DAY_MS;

    // Delete old presence records
    const presenceSnapshot = await db
      .collection(COLLECTIONS.PRESENCE)
      .where("lastUpdated", "<", thirtyDaysAgo)
      .get();

    // Delete old price cache
    const priceCacheSnapshot = await db
      .collection(COLLECTIONS.PRICE_CACHE)
      .where("timestamp", "<", oneDayAgo)
      .get();

    // Delete old rate limit stats
    const rateLimitStatsSnapshot = await db
      .collection(COLLECTIONS.RATE_LIMIT_STATS)
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    // Delete old rate limit requests
    const rateLimitRequestsSnapshot = await db
      .collection(COLLECTIONS.RATE_LIMITS)
      .where("lastUpdated", "<", thirtyDaysAgo)
      .get();

    // Find expired API keys
    const expiredKeysSnapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("expiresAt", "<", now)
      .where("enabled", "==", true)
      .get();

    // Find old disabled API keys
    const oldDisabledKeysSnapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("enabled", "==", false)
      .where("disabledAt", "<", thirtyDaysAgo)
      .get();

    // Perform all deletions in batches
    const batch = db.batch();

    presenceSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    priceCacheSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    rateLimitStatsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    rateLimitRequestsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    oldDisabledKeysSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Disable expired keys
    expiredKeysSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        enabled: false,
        disabledAt: new Date(),
        disabledReason: "expired",
      });
    });

    await batch.commit();

    const result: CleanupResult = {
      priceCache: priceCacheSnapshot.size,
      rateLimitStats: rateLimitStatsSnapshot.size,
      rateLimitRequests: rateLimitRequestsSnapshot.size,
      deletedVisits: 0,
      deletedPresence: presenceSnapshot.size,
      disabledApiKeys: expiredKeysSnapshot.size,
      deletedApiKeys: oldDisabledKeysSnapshot.size,
      total:
        priceCacheSnapshot.size +
        rateLimitStatsSnapshot.size +
        rateLimitRequestsSnapshot.size +
        presenceSnapshot.size +
        expiredKeysSnapshot.size +
        oldDisabledKeysSnapshot.size,
      cleanupTime: Date.now() - startTime,
      itemsCleaned: {
        priceCache: priceCacheSnapshot.size,
        rateLimitStats: rateLimitStatsSnapshot.size,
        rateLimitRequests: rateLimitRequestsSnapshot.size,
        visits: 0,
        presence: presenceSnapshot.size,
        disabledApiKeys: expiredKeysSnapshot.size,
        deletedApiKeys: oldDisabledKeysSnapshot.size,
      },
    };

    return result;
  } catch (error) {
    console.error("Error in cleanup service:", error);
    throw error;
  }
};

export const cleanupRateLimits = async (identifier: string): Promise<void> => {
  const db = getFirestore();
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  try {
    const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(identifier);
    const doc = await rateLimitRef.get();

    if (doc.exists) {
      const currentRequests = doc.data()?.requests || [];
      const updatedRequests = currentRequests.filter((timestamp: number) => timestamp > oneHourAgo);

      if (updatedRequests.length !== currentRequests.length) {
        await rateLimitRef.update({
          requests: updatedRequests,
          lastUpdated: now,
        });
      }
    }
  } catch (error) {
    console.error(`Error cleaning up rate limits for ${identifier}:`, error);
    throw error;
  }
};

export const analyzeVisitPatterns = async (
  fingerprintId: string,
): Promise<{
  patterns: VisitPattern[];
  engagement: SiteEngagement[];
}> => {
  const db = getFirestore();

  // Get all visits for this fingerprint, ordered by timestamp
  const visitsSnapshot = await db
    .collection(COLLECTIONS.VISITS)
    .where("fingerprintId", "==", fingerprintId)
    .orderBy("timestamp", "asc")
    .get();

  const visits: VisitData[] = visitsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<VisitData, "id">),
  }));

  // Analyze site transitions
  const patterns: Map<string, VisitPattern> = new Map();
  const siteVisits: Map<string, number[]> = new Map();

  for (let i = 0; i < visits.length - 1; i++) {
    const current = visits[i];
    const next = visits[i + 1];
    const timeSpent = next.timestamp - current.timestamp;

    // Track site transitions
    const key = `${current.siteId}-${next.siteId}`;
    const existing = patterns.get(key) || {
      currentSite: current.siteId,
      nextSite: next.siteId,
      transitionCount: 0,
      averageTimeSpent: 0,
    };

    existing.transitionCount++;
    existing.averageTimeSpent =
      (existing.averageTimeSpent * (existing.transitionCount - 1) + timeSpent) /
      existing.transitionCount;
    patterns.set(key, existing);

    // Track visits per site
    const siteVisitTimes = siteVisits.get(current.siteId) || [];
    siteVisitTimes.push(timeSpent);
    siteVisits.set(current.siteId, siteVisitTimes);
  }

  // Calculate site engagement metrics
  const engagement: SiteEngagement[] = Array.from(siteVisits.entries()).map(([siteId, times]) => {
    const totalVisits = times.length;
    const averageTimeSpent = times.reduce((a, b) => a + b, 0) / totalVisits;

    // Find most common next sites
    const nextSites = Array.from(patterns.values())
      .filter((p) => p.currentSite === siteId)
      .sort((a, b) => b.transitionCount - a.transitionCount)
      .slice(0, 3)
      .map((p) => p.nextSite);

    // Calculate return rate (visits > 1 indicates returns)
    const returnRate = totalVisits > 1 ? ((totalVisits - 1) / totalVisits) * 100 : 0;

    return {
      siteId,
      totalVisits,
      averageTimeSpent,
      returnRate,
      commonNextSites: nextSites,
    };
  });

  return {
    patterns: Array.from(patterns.values()),
    engagement: engagement,
  };
};
