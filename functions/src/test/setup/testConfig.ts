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
  mockApiKey: string;
  testHeaders: {
    "x-test-env": string;
    "x-test-fingerprint-id": string;
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

export const TEST_CONFIG: TestConfig = {
  projectId: "argos-434718",
  firestoreEmulator: "localhost:9090",
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
  mockApiKey: "test-api-key",
  testHeaders: {
    "x-test-env": "true",
    "x-test-fingerprint-id": "test-fingerprint-id",
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
