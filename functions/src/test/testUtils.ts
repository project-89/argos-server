import "../register";
import * as admin from "firebase-admin";
import { COLLECTIONS } from "../constants";
import axios from "axios";
import { TEST_CONFIG } from "./testConfig";

// Check if emulators are running
export const checkEmulators = async () => {
  try {
    const response = await axios.get(TEST_CONFIG.apiUrl + "/health");
    if (response.status === 200) {
      return true;
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      return true; // Endpoint exists but returns 404
    }
    if (error.code === "ECONNREFUSED") {
      console.error(
        "\x1b[31m%s\x1b[0m",
        `
Error: Firebase emulators are not running!
Please start the emulators first using:
npm run serve

Then run the tests again.
`,
      );
      process.exit(1);
    }
  }
  return false;
};

// Initialize Firebase Admin for testing
export const initializeTestEnvironment = async () => {
  try {
    // Check emulators first
    await checkEmulators();

    // Set environment variables
    process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: TEST_CONFIG.projectId,
    });
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.GCLOUD_PROJECT = TEST_CONFIG.projectId;

    // Initialize admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: TEST_CONFIG.projectId,
      });
    }

    // Clean the database before tests
    await cleanDatabase();

    return admin.firestore();
  } catch (error) {
    console.error("Failed to initialize test environment:", error);
    throw error;
  }
};

// Helper to create test data
export const createTestData = async () => {
  try {
    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      await initializeTestEnvironment();
    }

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

    // Create test API key with proper format
    const apiKey = "test-" + Math.random().toString(36).substring(2);
    await db.collection(COLLECTIONS.API_KEYS).add({
      key: apiKey,
      fingerprintId: fingerprintRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: null,
      enabled: true,
      metadata: {
        testData: true,
        name: "Test Key",
      },
      usageCount: 0,
      endpointStats: {},
    });

    return {
      fingerprintId: fingerprintRef.id,
      apiKey,
    };
  } catch (error) {
    console.error("Failed to create test data:", error);
    throw error;
  }
};

// Clean up test data
export const cleanDatabase = async () => {
  try {
    const db = admin.firestore();
    const collections = Object.values(COLLECTIONS);

    const promises = collections.map(async (collection) => {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      return batch.commit();
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to clean database:", error);
    throw error;
  }
};
