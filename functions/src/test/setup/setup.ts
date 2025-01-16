import { config } from "dotenv";
import { resolve } from "path";
import { Timestamp } from "firebase-admin/firestore";
import { MOCK_PRICES } from "./testConfig";
import { COLLECTIONS } from "../../constants/collections";

// Load test environment variables
config({ path: resolve(__dirname, "../.env.test") });

// Set up test environment
process.env.NODE_ENV = "test";
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "test-project",
  databaseURL: "https://test-project.firebaseio.com",
});

// Set up test encryption keys (32 bytes each, base64 encoded)
process.env.FIREBASE_CONFIG_ENCRYPTION_API_KEY = "dGVzdEtleVRlc3RLZXlUZXN0S2V5VGVzdEtleVRlc3RLZXk="; // 32 bytes
process.env.FIREBASE_CONFIG_ENCRYPTION_API_IV = "dGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2"; // 16 bytes

// Mock cached price data
const mockCacheData: Record<
  string,
  {
    usd?: number;
    usd_24h_change?: number;
    history?: Array<{ price: number; createdAt: Timestamp }>;
    createdAt: Timestamp;
  }
> = {
  Project89: {
    usd: MOCK_PRICES.Project89.usd,
    usd_24h_change: MOCK_PRICES.Project89.usd_24h_change,
    history: [
      { price: 0.15, createdAt: Timestamp.fromMillis(Date.now()) },
      { price: 0.14, createdAt: Timestamp.fromMillis(Date.now() - 86400000) },
    ],
    createdAt: Timestamp.fromMillis(Date.now()),
  },
};

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn((collectionName) => ({
      doc: jest.fn((docId) => ({
        get: jest.fn(async () => ({
          exists: collectionName === COLLECTIONS.PRICE_CACHE && docId === "Project89",
          data: () => mockCacheData[docId],
        })),
        set: jest.fn((data, options) => Promise.resolve()),
      })),
    })),
  })),
}));
