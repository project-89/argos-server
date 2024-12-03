import * as admin from "firebase-admin";
import { COLLECTIONS } from "../constants";

// Test environment configuration
export const TEST_CONFIG = {
  apiUrl: "http://localhost:5001/argos-434718/us-central1/api",
  firestoreEmulator: "localhost:9090",
  projectId: "argos-434718",
};

// Initialize admin with emulator settings
export const initializeTestEnvironment = () => {
  process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: TEST_CONFIG.projectId,
  });
  process.env.FUNCTIONS_EMULATOR = "true";

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: TEST_CONFIG.projectId,
    });
  }

  return admin.firestore();
};

// Helper to clean the database between tests
export const cleanDatabase = async () => {
  const db = admin.firestore();
  const collections = [
    COLLECTIONS.FINGERPRINTS,
    COLLECTIONS.VISITS,
    COLLECTIONS.PRICE_CACHE,
    COLLECTIONS.RATE_LIMITS,
    COLLECTIONS.API_KEYS,
  ];

  const promises = collections.map(async (collection) => {
    const snapshot = await db.collection(collection).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    return batch.commit();
  });

  await Promise.all(promises);
};

// Helper to create test data
export const createTestData = async () => {
  const db = admin.firestore();

  // Create test fingerprint
  const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
    fingerprint: "test-fingerprint",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    roles: ["user", "agent-initiate"],
    tags: {},
    metadata: {
      testData: true,
    },
  });

  // Create test API key
  await db.collection(COLLECTIONS.API_KEYS).add({
    key: "test-api-key",
    fingerprintId: fingerprintRef.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsed: null,
    enabled: true,
    metadata: {
      testData: true,
    },
    usageCount: 0,
    endpointStats: {},
  });

  return {
    fingerprintId: fingerprintRef.id,
  };
};

// Setup global test environment
beforeAll(() => {
  jest.setTimeout(10000); // Increase timeout to 10 seconds
  return initializeTestEnvironment();
}, 10000);

// Clean up after each test
afterEach(async () => {
  await cleanDatabase();
}, 10000);
