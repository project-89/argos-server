import * as admin from "firebase-admin";
import { COLLECTIONS } from "../../constants";
import axios from "axios";
import { TEST_CONFIG } from "../setup/testConfig";

// Configure axios for testing
export const configureAxios = (): void => {
  axios.defaults.validateStatus = () => true; // Don't throw on any status
  axios.defaults.headers.common = {
    ...axios.defaults.headers.common,
    ...TEST_CONFIG.testHeaders,
    "x-test-env": "true",
  };
  axios.defaults.timeout = TEST_CONFIG.defaultTimeout;

  // Ensure test environment is set
  process.env.NODE_ENV = "test";
  process.env.FUNCTIONS_EMULATOR = "true";
  process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
};

// Check if emulators are running
export const checkEmulators = async (): Promise<boolean> => {
  try {
    const response = await axios.get(TEST_CONFIG.apiUrl + "/health");
    return response.status === 404; // Endpoint exists but returns 404
  } catch (error: any) {
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
    return false;
  }
};

// Initialize Firebase Admin for testing
export const initializeTestEnvironment = async (): Promise<void> => {
  try {
    // Set environment variables
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: TEST_CONFIG.projectId,
    });
    process.env.GCLOUD_PROJECT = TEST_CONFIG.projectId;

    // Initialize admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: TEST_CONFIG.projectId,
      });
    }

    // Configure axios
    configureAxios();

    // Check emulators
    await checkEmulators();

    // Clean the database before tests
    await cleanDatabase();

    // Create test data
    await createTestData();
  } catch (error) {
    console.error("Failed to initialize test environment:", error);
    throw error;
  }
};

// Helper to create test data
export const createTestData = async (): Promise<void> => {
  try {
    const db = admin.firestore();

    // Create test fingerprint
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(TEST_CONFIG.testFingerprint.id).set({
      fingerprint: TEST_CONFIG.testFingerprint.fingerprint,
      roles: TEST_CONFIG.testFingerprint.roles,
      metadata: TEST_CONFIG.testFingerprint.metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      tags: {},
    });

    // Create test API key
    await db.collection(COLLECTIONS.API_KEYS).add({
      key: TEST_CONFIG.mockApiKey,
      fingerprintId: TEST_CONFIG.testFingerprint.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      enabled: true,
      metadata: {
        testData: true,
        name: "Test API Key",
      },
    });

    // Verify test data was created
    const fingerprintDoc = await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(TEST_CONFIG.testFingerprint.id)
      .get();
    if (!fingerprintDoc.exists) {
      throw new Error("Failed to create test fingerprint");
    }

    const apiKeySnapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("key", "==", TEST_CONFIG.mockApiKey)
      .get();
    if (apiKeySnapshot.empty) {
      throw new Error("Failed to create test API key");
    }
  } catch (error) {
    console.error("Failed to create test data:", error);
    throw error;
  }
};

// Clean up test data
export const cleanDatabase = async (): Promise<void> => {
  try {
    const db = admin.firestore();
    const collections = Object.values(COLLECTIONS) as string[];

    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      if (snapshot.docs.length > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.error("Failed to clean database:", error);
    throw error;
  }
};
