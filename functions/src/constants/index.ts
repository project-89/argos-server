import { PredefinedRole, MatrixIntegrity } from "@/types";

// Default token list type
export type SupportedToken = "project89" | "solana";
export const DEFAULT_TOKENS: readonly SupportedToken[] = ["project89", "solana"] as const;

export const PREDEFINED_ROLES: PredefinedRole[] = [
  "user",
  "agent-initiate",
  "agent-field",
  "agent-senior",
  "agent-master",
];

export const PUBLIC_ENDPOINTS = [
  "/reality-stability",
  "/register-fingerprint",
  "/get-fingerprint",
  "/log-visit",
  "/update-presence",
  "/remove-site",
] as const;

// Cache durations
export const CACHE_DURATIONS = {
  "1h": 60 * 1000, // 1 minute for hourly data
  "24h": 5 * 60 * 1000, // 5 minutes for daily data
  "7d": 15 * 60 * 1000, // 15 minutes for weekly data
} as const;

// Reality Stability Constants
export const REALITY_STABILITY = {
  MAXIMUM_STABILITY: 99.99, // Perfect simulation control
  MINIMUM_STABILITY: 89.0, // Critical simulation instability
  BASE_RESISTANCE: 0.01, // Minimum resistance level
  THRESHOLDS: {
    STABLE: 95,
    FLUCTUATING: 92,
    UNSTABLE: 90,
  },
  MATRIX_INTEGRITY: {
    STABLE: "STABLE" as MatrixIntegrity,
    FLUCTUATING: "FLUCTUATING" as MatrixIntegrity,
    UNSTABLE: "UNSTABLE" as MatrixIntegrity,
    CRITICAL: "CRITICAL" as MatrixIntegrity,
  },
} as const;

// API Rate Limits
export const API_RATE_LIMITS = {
  COINGECKO: {
    REQUESTS_PER_MINUTE: 30,
    MONTHLY_LIMIT: 10000,
    BUFFER: 100, // Buffer for monthly limit
  },
} as const;

// Collection Names
export const COLLECTIONS = {
  API_KEYS: "apiKeys",
  FINGERPRINTS: "fingerprints",
  VISITS: "visits",
  PRESENCE: "presence",
  ROLES: "roles",
  RATE_LIMITS: "rateLimits",
  RATE_LIMIT_STATS: "rateLimitStats",
  PRICE_CACHE: "priceCache",
} as const;

// External API Configuration
export const EXTERNAL_APIS = {
  COINGECKO: {
    BASE_URL: "https://api.coingecko.com/api/v3",
    DEFAULT_CURRENCY: "usd",
    DEFAULT_TOKENS,
  },
} as const;

// Role Management
export const ROLE_REQUIREMENTS = {
  "agent-initiate": {
    puzzle_solved: 3,
  },
  "agent-field": {
    mission_complete: 5,
  },
  "agent-senior": {
    mission_complete: 10,
  },
  "agent-master": {
    mission_complete: 20,
    puzzle_solved: 10,
  },
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_PROBABILITY: 0.01, // 1% chance of cleanup on each request
} as const;

// Firebase Configuration
export const FIREBASE_CONFIG = {
  REGION: "us-central1",
  MAX_INSTANCES: 1,
  MIN_INSTANCES: 0,
  MEMORY: "2GiB",
  TIMEOUT_SECONDS: 540,
} as const;
