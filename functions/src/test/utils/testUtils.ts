import axios, { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS, ROLES } from "../../constants";
import * as admin from "firebase-admin";
import { Agent } from "http";

interface TestHeaders extends RawAxiosRequestHeaders {
  "x-api-key"?: string;
  "x-test-env"?: string;
  "x-test-fingerprint-id"?: string;
}

// Create a shared HTTP agent with keepAlive disabled
const agent = new Agent({
  keepAlive: false,
  maxSockets: 1,
});

export const makeRequest = async (
  method: string,
  url: string,
  data: any = null,
  config: AxiosRequestConfig = {},
) => {
  const headers: TestHeaders = {
    "x-api-key": TEST_CONFIG.mockApiKey,
    "x-test-env": "true",
    "x-test-fingerprint-id": TEST_CONFIG.testFingerprint.id,
    ...config.headers,
  };

  // Remove undefined headers
  Object.keys(headers).forEach((key) => {
    if (headers[key as keyof TestHeaders] === undefined) {
      delete headers[key as keyof TestHeaders];
    }
  });

  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    data,
    headers,
    validateStatus: null, // Let axios throw on any non-2xx status
    httpAgent: agent, // Use the shared agent
    ...config,
  };

  try {
    const response = await axios(axiosConfig);
    if (response.status >= 400 && !config.validateStatus) {
      throw { response };
    }
    return response;
  } catch (error: any) {
    if (error.response) {
      throw error;
    }
    throw new Error(`Request failed: ${error.message}`);
  } finally {
    // Ensure the agent's sockets are destroyed
    agent.destroy();
  }
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

    // Wait for emulators to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Create test fingerprint
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
      fingerprint: TEST_CONFIG.testFingerprint.fingerprint,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      roles: [ROLES.USER],
      tags: {},
      metadata: TEST_CONFIG.testFingerprint.metadata,
    });

    // Update fingerprint ID in test config
    TEST_CONFIG.testFingerprint.id = fingerprintRef.id;

    // Create test API key
    const apiKey = TEST_CONFIG.mockApiKey;
    await db
      .collection(COLLECTIONS.API_KEYS)
      .doc(apiKey)
      .set({
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

    // Wait for data to be available
    await new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Wait for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Failed to clean database:", error);
    throw error;
  }
};
