export const CACHE_DURATION = {
  PRICE: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT: 60 * 60 * 1000, // 1 hour
  STABILITY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export type CacheDuration = (typeof CACHE_DURATION)[keyof typeof CACHE_DURATION];
