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
  apiUrl: string;
  firestoreEmulator: string;
  projectId: string;
  mockApiKey: string;
  maxRetries: number;
  retryDelay: number;
  defaultTimeout: number;
  testFingerprint: TestFingerprint;
  testTags: {
    visits: number;
    timeSpent: number;
  };
  testTagRules: {
    [key: string]: {
      min: number;
      role: string;
    };
  };
  availableRoles: string[];
  testHeaders: {
    [key: string]: string;
  };
}

export const TEST_CONFIG: TestConfig = {
  apiUrl: "http://localhost:5001/argos-434718/us-central1/api",
  firestoreEmulator: "localhost:9090",
  projectId: "argos-434718",
  mockApiKey: "test-api-key-123456789",
  maxRetries: 3,
  retryDelay: 1000,
  defaultTimeout: 10000,
  testFingerprint: {
    id: "test-fingerprint-id",
    fingerprint: "test-fingerprint",
    roles: ["user"],
    metadata: {
      testData: true,
      name: "Test User",
    },
  },
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
  testHeaders: {
    "x-test-env": "true",
    "x-test-fingerprint-id": "test-fingerprint-id",
    "x-api-key": "test-api-key-123456789",
    "Content-Type": "application/json",
  },
};

export const MOCK_PRICES: PriceData = {
  Project89: {
    usd: 0.15,
    usd_24h_change: 2.5,
  },
};
