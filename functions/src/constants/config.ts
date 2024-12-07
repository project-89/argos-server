export const FIREBASE_CONFIG = {
  region: "us-central1",
  timeoutSeconds: 60,
} as const;

export const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 60,
  monthlyLimit: 10000,
  buffer: 0.1,
} as const;

export const PRICE_SERVICE_CONFIG = {
  baseUrl: "https://api.coingecko.com/api/v3",
  defaultCurrency: "usd",
  defaultTokens: ["bitcoin", "ethereum"],
} as const;

export const STABILITY_CONFIG = {
  updateInterval: 15 * 60 * 1000, // 15 minutes
  thresholds: {
    stable: 0.8,
    fluctuating: 0.6,
    unstable: 0.4,
    critical: 0.2,
  },
} as const;

export const COLLECTION_NAMES = {
  FINGERPRINTS: "fingerprints",
  API_KEYS: "api-keys",
  VISITS: "visits",
  PRESENCE: "presence",
  PRICE_HISTORY: "price-history",
  STABILITY_METRICS: "stability-metrics",
} as const;

export const ROLE_REQUIREMENTS = {
  premium: {
    visits: 5,
    timeSpent: 300, // 5 minutes in seconds
  },
  vip: {
    visits: 20,
    timeSpent: 1800, // 30 minutes in seconds
  },
};
