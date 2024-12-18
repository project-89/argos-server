import { PriceData } from "../../services/priceService";

export interface TestFingerprint {
  id: string;
  fingerprint: string;
  roles: string[];
  metadata: {
    testData: boolean;
    name: string;
  };
}

export interface TestConfig {
  projectId: string;
  firestoreEmulator: string;
  apiUrl: string;
  defaultTimeout: number;
  testFingerprint: {
    id: string;
    fingerprint: string;
    roles: string[];
    metadata: {
      testData: boolean;
      name: string;
    };
  };
  maxRetries: number;
  retryDelay: number;
  testTags: {
    visits: number;
    timeSpent: number;
  };
  testTagRules: {
    visits: {
      min: number;
      role: string;
    };
    timeSpent: {
      min: number;
      role: string;
    };
  };
  availableRoles: string[];
}

// Set test environment
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "argos-434718",
});

// Set rate limit environment variables for testing
process.env.RATE_LIMIT_ENABLED = "true";
process.env.IP_RATE_LIMIT_ENABLED = "false";

// Set CORS environment variables for testing
process.env.ALLOWED_ORIGINS = "https://test.com,https://example.com,https://newsite.com";
process.env.DEV_ORIGIN_VITE = "http://localhost:5173";
process.env.DEV_ORIGIN_REACT = "http://localhost:3000";
process.env.DEV_ORIGIN_FIREBASE = "http://localhost:5000";

export const TEST_CONFIG: TestConfig = {
  projectId: "argos-434718",
  firestoreEmulator: "localhost:8080",
  apiUrl: "http://localhost:5001/argos-434718/us-central1/api",
  defaultTimeout: 10000,
  testFingerprint: {
    id: "test-fingerprint-id",
    fingerprint: "test-fingerprint",
    roles: ["user"],
    metadata: {
      testData: true,
      name: "Test Fingerprint",
    },
  },
  maxRetries: 3,
  retryDelay: 1000,
  testTags: {
    visits: 10,
    timeSpent: 600,
  },
  testTagRules: {
    visits: {
      min: 5,
      role: "premium",
    },
    timeSpent: {
      min: 300,
      role: "vip",
    },
  },
  availableRoles: ["user", "premium", "vip", "admin"],
};

export const MOCK_PRICES: PriceData = {
  Project89: {
    usd: 0.15,
    usd_24h_change: 2.5,
  },
};
