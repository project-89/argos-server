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
  total: number;
  cleanupTime: number;
  itemsCleaned: {
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
    visits: number;
    presence: number;
  };
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

    // Delete old visits
    const visitsSnapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

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

    // Perform all deletions in batches
    const batch = db.batch();

    visitsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    presenceSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    priceCacheSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    rateLimitStatsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    rateLimitRequestsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    const result: CleanupResult = {
      priceCache: priceCacheSnapshot.size,
      rateLimitStats: rateLimitStatsSnapshot.size,
      rateLimitRequests: rateLimitRequestsSnapshot.size,
      deletedVisits: visitsSnapshot.size,
      deletedPresence: presenceSnapshot.size,
      total:
        priceCacheSnapshot.size +
        rateLimitStatsSnapshot.size +
        rateLimitRequestsSnapshot.size +
        visitsSnapshot.size +
        presenceSnapshot.size,
      cleanupTime: Date.now() - startTime,
      itemsCleaned: {
        priceCache: priceCacheSnapshot.size,
        rateLimitStats: rateLimitStatsSnapshot.size,
        rateLimitRequests: rateLimitRequestsSnapshot.size,
        visits: visitsSnapshot.size,
        presence: presenceSnapshot.size,
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
