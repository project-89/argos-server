export const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 15 * 60 * 1000, // 15 minutes
  cleanupProbability: 0.1, // 10% chance of cleanup on each operation
} as const;

export const CACHE_KEYS = {
  PRICE_DATA: "price_data",
  STABILITY_INDEX: "stability_index",
  API_KEY: "api_key",
  FINGERPRINT: "fingerprint",
} as const;

export const TTL_CONFIG = {
  PRICE_DATA: 5 * 60, // 5 minutes
  STABILITY_INDEX: 15 * 60, // 15 minutes
  API_KEY: 60 * 60, // 1 hour
  FINGERPRINT: 24 * 60 * 60, // 24 hours
} as const;

export const CACHE_DURATION = {
  PRICE: 5 * 60 * 1000,
  RATE_LIMIT: 60 * 60 * 1000,
  STABILITY: 24 * 60 * 60 * 1000,
} as const;
