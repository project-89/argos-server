import axios, { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS } from "../../constants";
import * as admin from "firebase-admin";
import { Agent } from "http";
import { generateApiKey, encryptApiKey } from "../../utils/api-key";

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
    headers,
    validateStatus: config.validateStatus ?? null, // Use provided validateStatus or default to null
    httpAgent: agent, // Use the shared agent
    ...config,
  };

  // Only add data for non-GET requests
  if (method.toLowerCase() !== "get" && data !== null) {
    axiosConfig.data = data;
  }

  try {
    const response = await axios(axiosConfig);
    // Only throw on non-2xx status if validateStatus is not provided
    if (response.status >= 400 && !config.validateStatus) {
      throw { response };
    }
    return response;
  } catch (error: any) {
    // If validateStatus is provided, return the error response
    if (error.response && config.validateStatus) {
      return error.response;
    }
    // Otherwise, throw the error
    throw error;
  }
};

// Initialize Firebase Admin for testing
export const initializeTestEnvironment = async () => {
  try {
    console.log("Initializing test environment...");

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

    // Verify emulator connection
    let retries = 3;
    while (retries > 0) {
      try {
        console.log("Attempting to connect to Firestore emulator...");
        const testDoc = await db.collection("_test_").add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await testDoc.delete();
        console.log("Successfully connected to Firestore emulator");
        break;
      } catch (error) {
        console.error(`Failed to connect to Firestore emulator (${retries} retries left):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return db;
  } catch (error) {
    console.error("Failed to initialize test environment:", error);
    throw error;
  }
};

// Helper to create test data
export const createTestData = async (options: { roles?: string[] } = {}) => {
  try {
    console.log("Creating test data...");

    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      await initializeTestEnvironment();
    }

    const db = admin.firestore();

    // Generate a unique fingerprint value
    const uniqueFingerprint = `test-fingerprint-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Create fingerprint directly in Firestore
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc();
    const fingerprintId = fingerprintRef.id;
    await fingerprintRef.set({
      fingerprint: uniqueFingerprint,
      metadata: TEST_CONFIG.testFingerprint.metadata,
      roles: options.roles || ["user"],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate and store API key directly in Firestore
    const plainApiKey = generateApiKey();
    const encryptedApiKey = encryptApiKey(plainApiKey);
    const apiKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
    await apiKeyRef.set({
      key: encryptedApiKey,
      fingerprintId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiration
      enabled: true,
      metadata: {
        name: "Test API Key",
      },
    });

    console.log("Test data created successfully");
    return { fingerprintId, apiKey: encryptedApiKey, fingerprint: uniqueFingerprint };
  } catch (error) {
    console.error("Failed to create test data:", error);
    throw error;
  }
};

// Clean up test data
export const cleanDatabase = async () => {
  try {
    console.log("Cleaning database...");
    const db = admin.firestore();
    const collections = Object.values(COLLECTIONS);

    const promises = collections.map(async (collection) => {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      return batch.commit();
    });

    await Promise.all(promises);
    console.log("Database cleaned successfully");
  } catch (error) {
    console.error("Failed to clean database:", error);
    throw error;
  }
};
