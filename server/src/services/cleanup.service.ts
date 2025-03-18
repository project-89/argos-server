import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { getCurrentUnixMillis, ApiError } from "../utils";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";
import { Visit, VisitPattern, SiteEngagement, VisitPatternAnalysisResponse } from "../schemas";
import { stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Cleanup Service]";

interface CleanupResult {
  cleanupTime: number;
  itemsCleaned: {
    visits: number;
    presence: number;
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
  };
}
/**
 * Cleanup service to remove old data from the database
 * @returns {Promise<CleanupResult>} Result of the cleanup operation
 */
export const cleanupService = async (): Promise<CleanupResult> => {
  const db = await getDb();
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
    console.log(`${LOG_PREFIX} Starting cleanup process...`);

    // Delete old presence records
    const presenceResult = await db
      .collection(COLLECTIONS.PRESENCE)
      .deleteMany({ lastUpdated: { $lt: thirtyDaysAgo } });

    result.itemsCleaned.presence = presenceResult.deletedCount || 0;
    console.log(`${LOG_PREFIX} Cleaned up ${result.itemsCleaned.presence} presence records`);

    // Delete old price cache
    const priceCacheResult = await db
      .collection(COLLECTIONS.PRICE_CACHE)
      .deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    result.itemsCleaned.priceCache = priceCacheResult.deletedCount || 0;
    console.log(`${LOG_PREFIX} Cleaned up ${result.itemsCleaned.priceCache} price cache entries`);

    // Delete old rate limit stats
    const rateLimitStatsResult = await db
      .collection(COLLECTIONS.RATE_LIMIT_STATS)
      .deleteMany({ timestamp: { $lt: thirtyDaysAgo } });

    result.itemsCleaned.rateLimitStats = rateLimitStatsResult.deletedCount || 0;
    console.log(`${LOG_PREFIX} Cleaned up ${result.itemsCleaned.rateLimitStats} rate limit stats`);

    // Delete old rate limit requests
    const rateLimitRequestsResult = await db
      .collection(COLLECTIONS.RATE_LIMITS)
      .deleteMany({ lastUpdated: { $lt: oneHourAgo } });

    result.itemsCleaned.rateLimitRequests = rateLimitRequestsResult.deletedCount || 0;
    console.log(
      `${LOG_PREFIX} Cleaned up ${result.itemsCleaned.rateLimitRequests} rate limit requests`,
    );

    console.log(`${LOG_PREFIX} Cleanup completed successfully`);
    return result;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to cleanup data:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CLEANUP_DATA);
  }
};

export const cleanupRateLimits = async (identifier: string): Promise<void> => {
  const db = await getDb();
  const now = getCurrentUnixMillis();
  const oneHourAgo = now - 3600000;

  try {
    console.log(`${LOG_PREFIX} Cleaning up rate limits for ${identifier}`);

    // Create string ID filter for rate limits
    const rateLimitFilter = stringIdFilter("_id", identifier);

    // Get the current rate limit document
    const rateLimitDoc = await db.collection(COLLECTIONS.RATE_LIMITS).findOne(rateLimitFilter);

    if (rateLimitDoc) {
      const currentRequests = rateLimitDoc.requests || [];
      const updatedRequests = currentRequests.filter((timestamp: number) => timestamp > oneHourAgo);

      if (updatedRequests.length !== currentRequests.length) {
        await db.collection(COLLECTIONS.RATE_LIMITS).updateOne(rateLimitFilter, {
          $set: {
            requests: updatedRequests,
            lastUpdated: now,
          },
        });
        console.log(
          `${LOG_PREFIX} Updated rate limits for ${identifier}, removed ${
            currentRequests.length - updatedRequests.length
          } old requests`,
        );
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to cleanup rate limits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CLEANUP_RATE_LIMITS);
  }
};

export const analyzeVisitPatterns = async (
  fingerprintId: string,
): Promise<VisitPatternAnalysisResponse> => {
  try {
    console.log(`${LOG_PREFIX} Analyzing visit patterns for ${fingerprintId}`);
    const db = await getDb();

    // Get all visits for this fingerprint, ordered by timestamp
    const fingerprintFilter = stringIdFilter("fingerprintId", fingerprintId);
    const visits = await db
      .collection(COLLECTIONS.VISITS)
      .find(fingerprintFilter)
      .sort({ createdAt: 1 })
      .toArray();

    const formattedVisits = formatDocuments<Visit>(visits);

    // Analyze site transitions
    const patterns: Map<string, VisitPattern> = new Map();
    const siteVisits: Map<string, number[]> = new Map();

    for (let i = 0; i < formattedVisits.length - 1; i++) {
      const current = formattedVisits[i];
      const next = formattedVisits[i + 1];

      // Extract numeric timestamps based on MongoDB's format
      const currentTimestamp =
        typeof current.createdAt === "number"
          ? current.createdAt
          : (current.createdAt as any).seconds
          ? (current.createdAt as any).seconds * 1000
          : 0;

      const nextTimestamp =
        typeof next.createdAt === "number"
          ? next.createdAt
          : (next.createdAt as any).seconds
          ? (next.createdAt as any).seconds * 1000
          : 0;

      const timeSpent = Math.floor((nextTimestamp - currentTimestamp) / 1000); // Convert to seconds

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

    console.log(
      `${LOG_PREFIX} Completed analysis for ${fingerprintId}, found ${patterns.size} patterns and ${engagement.length} engagement metrics`,
    );

    return {
      patterns: Array.from(patterns.values()),
      engagement: engagement,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to analyze visit patterns:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_ANALYZE_VISIT_PATTERNS);
  }
};
