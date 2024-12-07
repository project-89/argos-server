export const COLLECTIONS = {
  FINGERPRINTS: "fingerprints",
  API_KEYS: "api-keys",
  VISITS: "visits",
  PRESENCE: "presence",
  PRICE_HISTORY: "price-history",
  STABILITY_METRICS: "stability-metrics",
  RATE_LIMITS: "rate-limits",
  RATE_LIMIT_STATS: "rate-limit-stats",
  TAG_RULES: "tag-rules",
  ROLES: "roles",
  PRICE_CACHE: "priceCache",
  SITES: "sites",
} as const;

export const PUBLIC_ENDPOINTS = [
  "/fingerprint/register",
  "/fingerprint",
  "/visit/log",
  "/visit/presence",
  "/visit/site/remove",
  "/visit/history",
  "/reality-stability",
  "/role/available",
  "/apiKey/validate",
  "/price/current",
  "/price/history",
] as const;

export const ROLES = {
  USER: "user",
  PREMIUM: "premium",
  VIP: "vip",
  ADMIN: "admin",
} as const;

export const CACHE_DURATION = {
  PRICE: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT: 60 * 60 * 1000, // 1 hour
  STABILITY: 24 * 60 * 60 * 1000, // 24 hours
} as const;
