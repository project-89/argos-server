import axios, { AxiosRequestConfig, AxiosError, RawAxiosRequestHeaders } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS } from "../../constants";
import * as admin from "firebase-admin";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

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
    // Move x-api-key to the root level of headers to ensure it's sent correctly
    headers["x-api-key"] = options.headers["x-api-key"];
    console.log("Request headers:", {
      ...headers,
      "x-api-key": "[REDACTED]",
    });
  } else {
    console.log("No API key provided in request");
    console.log("Request headers:", headers);
  }

  const config: AxiosRequestConfig = {
    method,
    url,
    validateStatus: options.validateStatus ?? ((status) => true), // Accept all status codes by default
    withCredentials,
    httpAgent,
    httpsAgent,
    headers,
  };

  // Only add data if it's defined and not a GET/HEAD/OPTIONS request
  if (data !== undefined && !["get", "head", "options"].includes(method.toLowerCase())) {
    config.data = data;
  }

  console.log("Making request with config:", {
    method: config.method,
    url: config.url,
    withCredentials: config.withCredentials,
    headers: {
      ...config.headers,
      "x-api-key": config.headers?.["x-api-key"] ? "[REDACTED]" : undefined,
    },
    data: config.data,
  });

  try {
    const response = await axios(config);
    console.log("Response received:", {
      status: response.status,
      headers: response.headers,
      data: response.data,
    });

    return response;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      console.error("Request failed:", {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
      });
      throw error;
    }
    throw error;
  } finally {
    // Close the specific agents used for this request
    httpAgent.destroy();
    httpsAgent.destroy();
  }
};

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
    const db = admin.firestore();
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
