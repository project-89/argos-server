/**
 * Cleanup Service Types
 * Contains types for data cleanup and maintenance operations
 */

/**
 * Cleanup Results
 */
export interface CleanupResult {
  cleanupTime: number;
  itemsCleaned: {
    visits: number;
    presence: number;
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
  };
}
