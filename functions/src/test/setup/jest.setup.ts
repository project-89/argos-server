import { TEST_CONFIG } from "./testConfig";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

beforeAll(async () => {
  // Set environment variables
  process.env.FUNCTIONS_EMULATOR = "true";
  process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: TEST_CONFIG.projectId,
  });
  process.env.GCLOUD_PROJECT = TEST_CONFIG.projectId;
  process.env.NODE_ENV = "test";

  // Initialize admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: TEST_CONFIG.projectId,
    });

    // Configure Firestore settings only once during initialization
    const db = getFirestore();
    db.settings({
      host: TEST_CONFIG.firestoreEmulator,
      ssl: false,
      experimentalForceLongPolling: false,
      experimentalAutoDetectLongPolling: false,
    });
  }
});

afterAll(async () => {
  // Clean up Firestore connections
  const db = getFirestore();
  await db.terminate();

  // Clean up Firebase apps
  await Promise.all(admin.apps.map((app) => app?.delete()));
});
