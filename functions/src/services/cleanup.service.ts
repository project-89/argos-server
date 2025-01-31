import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { getCurrentUnixMillis } from "../utils/timestamp";
import { CleanupResult, VisitData, VisitPattern } from "@/types/cleanup.types";
import { SiteEngagement } from "@/types/visit.types";

/**
 * Cleanup service to remove old data from the database
 * @returns {Promise<CleanupResult>} Result of the cleanup operation
 */
export const cleanupService = async (): Promise<CleanupResult> => {
  const db = getFirestore();
  const now = getCurrentUnixMillis();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Initialize cleanup result
  const result: CleanupResult = {
    cleanupTime: now,
    itemsCleaned: {
      visits: 0,
      presence: 0,
      priceCache: 0,
      rateLimitStats: 0,
      rateLimitRequests: 0,
    },
  };

  try {
    // Delete old presence records
    const presenceSnapshot = await db
      .collection(COLLECTIONS.PRESENCE)
      .where("lastUpdated", "<", thirtyDaysAgo)
      .get();

    for (const doc of presenceSnapshot.docs) {
      await doc.ref.delete();
    }
    result.itemsCleaned.presence = presenceSnapshot.size;

    // Delete old price cache
    const priceCacheSnapshot = await db
      .collection(COLLECTIONS.PRICE_CACHE)
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    for (const doc of priceCacheSnapshot.docs) {
      await doc.ref.delete();
    }
    result.itemsCleaned.priceCache = priceCacheSnapshot.size;

    // Delete old rate limit stats
    const rateLimitStatsSnapshot = await db
      .collection(COLLECTIONS.RATE_LIMIT_STATS)
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    for (const doc of rateLimitStatsSnapshot.docs) {
      await doc.ref.delete();
    }
    result.itemsCleaned.rateLimitStats = rateLimitStatsSnapshot.size;

    // Delete old rate limit requests
    const rateLimitRequestsSnapshot = await db
      .collection(COLLECTIONS.RATE_LIMITS)
      .where("lastUpdated", "<", oneHourAgo)
      .get();

    for (const doc of rateLimitRequestsSnapshot.docs) {
      await doc.ref.delete();
    }
    result.itemsCleaned.rateLimitRequests = rateLimitRequestsSnapshot.size;

    return result;
  } catch (error) {
    console.error("Error in cleanup service:", error);
    throw error;
  }
};

export const cleanupRateLimits = async (identifier: string): Promise<void> => {
  const db = getFirestore();
  const now = getCurrentUnixMillis();
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
