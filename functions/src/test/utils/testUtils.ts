import * as admin from "firebase-admin";
import { COLLECTIONS, ROLES } from "../../constants";
import axios, { AxiosRequestConfig, Method } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";

// Helper function to make requests with appropriate headers
export const makeRequest = async (
  method: Method,
  url: string,
  data: any = undefined,
  config: AxiosRequestConfig = {},
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-test-env": "true",
    "x-test-fingerprint-id": TEST_CONFIG.testFingerprint.id,
    "x-api-key": TEST_CONFIG.mockApiKey, // Always include API key in test environment
  };

  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    ...config,
    headers: {
      ...headers,
      ...config.headers,
    },
  };

  // Only add data if it's not undefined
  if (data !== undefined) {
    axiosConfig.data = data;
  }

  return axios(axiosConfig);
};

export const configureAxios = () => {
  // Configure axios defaults for testing
  axios.defaults.headers.common = {
    ...axios.defaults.headers.common,
    "Content-Type": "application/json",
    "x-test-env": "true",
    "x-test-fingerprint-id": TEST_CONFIG.testFingerprint.id,
    "x-api-key": TEST_CONFIG.mockApiKey, // Always include API key in test environment
  };
};

// Check if emulators are running
export const checkEmulators = async () => {
  try {
    const response = await makeRequest("get", TEST_CONFIG.apiUrl + "/health");
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
    }

    const db = admin.firestore();

    // Clean the database before tests
    await cleanDatabase();

    // Check emulators
    await checkEmulators();

    return db;
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

    // Create test fingerprint with specific ID
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(TEST_CONFIG.testFingerprint.id)
      .set({
        id: TEST_CONFIG.testFingerprint.id,
        fingerprint: TEST_CONFIG.testFingerprint.fingerprint,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        roles: [ROLES.USER],
        tags: {},
        metadata: TEST_CONFIG.testFingerprint.metadata,
      });

    // Create test API key
    await db
      .collection(COLLECTIONS.API_KEYS)
      .doc(TEST_CONFIG.mockApiKey)
      .set({
        key: TEST_CONFIG.mockApiKey,
        fingerprintId: TEST_CONFIG.testFingerprint.id,
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
      fingerprintId: TEST_CONFIG.testFingerprint.id,
      apiKey: TEST_CONFIG.mockApiKey,
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
