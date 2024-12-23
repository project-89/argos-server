import axios, { AxiosRequestConfig, AxiosError, RawAxiosRequestHeaders } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS } from "../../constants";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

/**
 * Make a request to the test server
 */
export const makeRequest = async (
  method: string,
  url: string,
  data?: any,
  options: AxiosRequestConfig = {},
) => {
  // Create new agents for this request
  const httpAgent = new HttpAgent({ keepAlive: false });
  const httpsAgent = new HttpsAgent({ keepAlive: false });

  // Set default headers
  const defaultHeaders: RawAxiosRequestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Handle CORS headers based on credentials
  const withCredentials = options.withCredentials ?? true;
  if (withCredentials) {
    // For credentialed requests, must use a valid origin
    defaultHeaders.Origin = options.headers?.Origin ?? "http://localhost:5173";
  } else {
    // For non-credentialed requests, origin is optional
    defaultHeaders.Origin = options.headers?.Origin ?? undefined;
  }

  // For OPTIONS requests, ensure proper preflight headers
  if (method.toLowerCase() === "options") {
    defaultHeaders["Access-Control-Request-Method"] =
      options.headers?.["Access-Control-Request-Method"] || "GET";
    defaultHeaders["Access-Control-Request-Headers"] = [
      "content-type",
      "authorization",
      "x-api-key",
    ].join(",");
  }

  // Merge headers, ensuring API key is properly set
  const headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  // Ensure x-api-key is set if provided
  if (options.headers?.["x-api-key"]) {
    headers["x-api-key"] = options.headers["x-api-key"];
  }

  const config: AxiosRequestConfig = {
    method,
    url,
    validateStatus: options.validateStatus ?? ((status) => true),
    withCredentials,
    httpAgent,
    httpsAgent,
    headers,
  };

  if (data !== undefined && !["get", "head", "options"].includes(method.toLowerCase())) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      throw error;
    }
    throw error;
  } finally {
    httpAgent.destroy();
    httpsAgent.destroy();
  }
};

/**
 * Initialize test environment
 */
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

    // Disable all rate limiting for tests
    process.env.RATE_LIMIT_ENABLED = "false";
    process.env.IP_RATE_LIMIT_ENABLED = "false";
    process.env.FINGERPRINT_RATE_LIMIT_ENABLED = "false";

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
        experimentalForceLongPolling: true,
      });
    }

    // Get Firestore instance
    const db = getFirestore();

    // Clean the database
    await cleanDatabase(db);
    return db;
  } catch (error) {
    console.error("Failed to initialize test environment:", error);
    throw error;
  }
};

/**
 * Generate a test fingerprint
 */
export const generateTestFingerprint = () => {
  return {
    id: `test-fingerprint-${Date.now()}`,
    components: {
      userAgent: "Test User Agent",
      language: "en-US",
      platform: "Test Platform",
      screenResolution: "1920x1080",
      timezone: "UTC",
      webdriver: false,
    },
    metadata: {
      ip: "127.0.0.1",
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Create test data for endpoints
 */
export const createTestData = async (options: { roles?: string[]; isAdmin?: boolean } = {}) => {
  try {
    console.log("Creating test data...");

    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      await initializeTestEnvironment();
    }

    // Generate a unique fingerprint value
    const uniqueFingerprint = `test-fingerprint-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Register fingerprint first (always with default user role)
    const fingerprintResponse = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/fingerprint/register`,
      {
        fingerprint: uniqueFingerprint,
        metadata: TEST_CONFIG.testFingerprint.metadata,
      },
    );

    if (!fingerprintResponse.data.success || !fingerprintResponse.data.data.id) {
      throw new Error(
        "Failed to register fingerprint: " + JSON.stringify(fingerprintResponse.data),
      );
    }

    const fingerprintId = fingerprintResponse.data.data.id;

    // Then register API key for the fingerprint
    const apiKeyResponse = await makeRequest("post", `${TEST_CONFIG.apiUrl}/api-key/register`, {
      fingerprintId,
    });

    if (!apiKeyResponse.data.success || !apiKeyResponse.data.data.key) {
      throw new Error("Failed to register API key: " + JSON.stringify(apiKeyResponse.data));
    }

    const apiKey = apiKeyResponse.data.data.key;

    // Set roles directly in the database
    const db = getFirestore();
    if (options.isAdmin || options.roles) {
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(fingerprintId)
        .update({
          roles: options.roles ?? (options.isAdmin ? ["user", "admin"] : ["user"]),
        });
    }

    console.log("Test data created successfully");
    return {
      fingerprintId,
      apiKey,
      fingerprint: uniqueFingerprint,
    };
  } catch (error) {
    console.error("Failed to create test data:", error);
    throw error;
  }
};

export const cleanDatabase = async (db?: admin.firestore.Firestore) => {
  try {
    console.log("Cleaning database...");

    // Get database instance if not provided
    if (!db) {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: TEST_CONFIG.projectId,
        });
      }
      db = getFirestore();
    }

    const collections = Object.values(COLLECTIONS);
    console.log("Cleaning collections:", collections);

    const promises = collections.map(async (collection) => {
      const snapshot = await db!.collection(collection).get();
      const batch = db!.batch();
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
