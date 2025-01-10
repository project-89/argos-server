import axios, { AxiosRequestConfig, AxiosError, RawAxiosRequestHeaders } from "axios";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS } from "../../constants/collections";

import { getFirestore } from "firebase-admin/firestore";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import { getCurrentUnixMillis } from "../../utils/timestamp";

// Create shared agents for all requests
const httpAgent = new HttpAgent({ keepAlive: true });
const httpsAgent = new HttpsAgent({ keepAlive: true });

/**
 * Make a request to the test server
 */
export const makeRequest = async (
  method: string,
  url: string,
  data?: any,
  options: AxiosRequestConfig = {},
) => {
  console.log(`🔵 Making ${method.toUpperCase()} request to ${url}`);

  // Set default headers
  const defaultHeaders: RawAxiosRequestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Handle CORS headers based on credentials
  const withCredentials = options.withCredentials ?? true;
  if (withCredentials) {
    defaultHeaders.Origin = options.headers?.Origin ?? "http://localhost:5173";
  } else {
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
    validateStatus: () => true,
    withCredentials,
    httpAgent,
    httpsAgent,
    headers,
    timeout: TEST_CONFIG.defaultTimeout,
    ...options,
  };

  if (
    data !== null &&
    data !== undefined &&
    !["get", "head", "options"].includes(method.toLowerCase())
  ) {
    config.data = data;
  }

  try {
    console.log(`📤 Request config:`, {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data,
    });

    const response = await axios(config);

    console.log(`📥 Response:`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });

    return response;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      console.error(`❌ Request failed:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      return error.response;
    }
    console.error(`❌ Request error:`, error);
    throw error;
  }
};

/**
 * Create test data for endpoints
 */
export const createTestData = async (options: { roles?: string[]; isAdmin?: boolean } = {}) => {
  try {
    console.log("Creating test data...");

    // Generate a unique fingerprint value
    const uniqueFingerprint = `test-fingerprint-${getCurrentUnixMillis()}-${Math.random().toString(36).substring(2)}`;

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

/**
 * Clean the database between tests
 */
export const cleanDatabase = async () => {
  try {
    console.log("🧹 Cleaning database...");
    const db = getFirestore();
    const collections = Object.values(COLLECTIONS);
    console.log("📚 Cleaning collections:", collections);

    const promises = collections.map(async (collection) => {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      return batch.commit();
    });

    await Promise.all(promises);
    console.log("✨ Database cleaned successfully");
  } catch (error) {
    console.error("💥 Failed to clean database:", error);
    throw error;
  }
};
