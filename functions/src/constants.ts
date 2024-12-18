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

// Public endpoints that should not require API key authentication
export const PUBLIC_ENDPOINTS: readonly string[] = [
  "/fingerprint/register",
  "/api-key/register",
  "/api-key/validate",
  "/role/available",
  "/price/current",
  "/price/history/:tokenId",
  "/reality-stability",
];

export const ROLES = {
  USER: "user",
  PREMIUM: "premium",
  VIP: "vip",
  ADMIN: "admin",
} as const;

export const CACHE_DURATION = {
  PRICE: 5 * 60 * 1000,
  RATE_LIMIT: 60 * 60 * 1000,
  STABILITY: 24 * 60 * 60 * 1000,
} as const;
