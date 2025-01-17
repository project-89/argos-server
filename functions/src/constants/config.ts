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

export const CORS_CONFIG = {
  // Development-only origins (only allowed when NODE_ENV=test or FUNCTIONS_EMULATOR=true)
  defaultOrigins: [
    "http://localhost:5173", // Vite dev server (development only)
    "http://localhost:3000", // React dev server (development only)
    "http://localhost:5000", // Firebase emulator (development only)
  ] as string[],

  // Test-specific origins (used in integration tests)
  testOrigins: ["https://test.com", "https://example.com", "https://newsite.com"] as string[],

  // Production origins - the only origins allowed in production environment
  productionOrigins: [
    "https://oneirocom.ai", // Main production site
  ] as string[],

  // Get allowed origins based on environment
  getAllowedOrigins: (): readonly string[] => {
    const origins: string[] = [];
    const isTestOrDev =
      process.env.NODE_ENV === "test" || process.env.FUNCTIONS_EMULATOR === "true";

    // Development/Test environment only
    if (isTestOrDev) {
      origins.push(...CORS_CONFIG.defaultOrigins);
      // Include test origins only in test environment
      if (process.env.NODE_ENV === "test") {
        origins.push(...CORS_CONFIG.testOrigins);
      }
    } else {
      // Production environment
      origins.push(...CORS_CONFIG.productionOrigins);
    }

    // Add additional origins from environment variable (useful for dynamic configuration in production)
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
      origins.push(...envOrigins.split(",").map((origin) => origin.trim()));
    }

    // Log warning if no origins are configured in production
    if (process.env.NODE_ENV === "production" && origins.length === 0) {
      console.error("[CORS Config] SECURITY WARNING: No CORS origins configured in production!");
    }

    return [...new Set(origins)];
  },

  // CORS Options with security-focused settings
  options: {
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as string[],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"] as string[],
    exposedHeaders: ["Content-Length", "Content-Type", "x-api-key"] as string[],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
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
