import fetch, { RequestInit } from "node-fetch";
import { TEST_CONFIG } from "../config/testConfig";
import { COLLECTIONS } from "../../constants/collections.constants";
import { getFirestore } from "firebase-admin/firestore";
import { Agent as HttpAgent } from "http";

// Create a custom agent with appropriate settings for testing
const agent = new HttpAgent({
  keepAlive: true,
  maxSockets: Infinity, // No limit for tests
  timeout: 500, // Faster timeout for tests
  keepAliveMsecs: 100, // Shorter keepalive
});

/**
 * Destroy the HTTP agent to clean up any remaining connections
 */
export const destroyAgent = () => {
  if (agent) {
    agent.destroy();
  }
};

export interface TestDataOptions {
  metadata?: Record<string, any>;
  roles?: string[];
  skipCleanup?: boolean;
  initialTags?: Record<string, any>;
}

export const makeRequest = async (config: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, string>;
  validateStatus?: () => boolean;
}) => {
  console.log(`🔵 Making ${config.method.toUpperCase()} request to ${config.url}`);

  try {
    // Add query parameters to URL if provided
    const urlWithParams = config.params
      ? `${config.url}${config.url.includes("?") ? "&" : "?"}${new URLSearchParams(config.params)}`
      : config.url;

    const requestConfig: RequestInit = {
      method: config.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: config.data ? JSON.stringify(config.data) : undefined,
      agent, // Use our custom agent
    };

    console.log(`📤 Request config:`, {
      method: config.method,
      url: urlWithParams,
      headers: requestConfig.headers,
      data: config.data,
      params: config.params,
    });

    const response = await fetch(urlWithParams, requestConfig);
    let data;

    // Only try to parse JSON for non-OPTIONS requests
    if (config.method.toLowerCase() !== "options") {
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }
    }

    // Convert headers to a plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = {
      status: response.status,
      statusText: response.statusText,
      data,
      headers,
    };

    console.log(`📥 Response:`, result);

    return result;
  } catch (error) {
    console.error(`❌ Request failed:`, error);
    throw error;
  }
};

/**
 * Create test data for endpoints
 */
export const createTestData = async (options: TestDataOptions = {}) => {
  console.log("Creating test data with options:", options);

  // Clean database first unless skipCleanup is true
  if (!options.skipCleanup) {
    await cleanDatabase();
  }

  // Register fingerprint
  const fingerprintStr = `test-fingerprint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fingerprintResponse = await makeRequest({
    method: "post",
    url: `${TEST_CONFIG.apiUrl}/fingerprint/register`,
    data: {
      fingerprint: fingerprintStr,
      metadata: options.metadata || {
        testData: true,
        name: "Test Fingerprint",
      },
    },
  });

  if (!fingerprintResponse.data.success) {
    console.error("Failed to register fingerprint:", fingerprintResponse.data);
    throw new Error("Failed to register fingerprint");
  }

  const fingerprintId = fingerprintResponse.data.data.id;
  console.log("Created fingerprint:", { fingerprintId });

  // If roles or tags need to be set, do it directly in Firestore
  if (options.roles || options.initialTags) {
    const db = getFirestore();
    console.log("Setting roles/tags for fingerprint:", {
      fingerprintId,
      roles: options.roles,
      initialTags: options.initialTags,
    });

    // First check the current state
    const beforeDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();
    console.log("Document state before setting roles/tags:", beforeDoc.data());

    // Build document data with only defined fields
    const docData: Record<string, any> = {
      fingerprint: fingerprintStr,
      metadata: options.metadata || {
        testData: true,
        name: "Test Fingerprint",
      },
    };

    // Only add roles if defined
    if (options.roles) {
      docData.roles = options.roles;
    }

    // Only add tags if defined
    if (options.initialTags) {
      docData.tags = options.initialTags;
    }

    // Set initial roles and tags
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).set(docData, { merge: true });

    // Verify the update
    const afterDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();
    console.log("Document state after setting roles/tags:", afterDoc.data());
  }

  // Register API key - no authentication needed for first key
  const apiKeyResponse = await makeRequest({
    method: "post",
    url: `${TEST_CONFIG.apiUrl}/api-key/register`,
    data: {
      fingerprintId,
    },
  });

  if (!apiKeyResponse.data.success) {
    console.error("Failed to register API key:", apiKeyResponse.data);
    throw new Error("Failed to register API key");
  }

  const apiKey = apiKeyResponse.data.data.key;
  console.log("Created API key for fingerprint:", { fingerprintId });

  return {
    fingerprintId,
    apiKey,
  };
};

/**
 * Clean the database between tests
 */
export const cleanDatabase = async () => {
  try {
    // Safety checks to prevent accidental production data deletion
    if (process.env.NODE_ENV !== "test") {
      throw new Error("cleanDatabase can only be run in test environment");
    }
    if (!process.env.FUNCTIONS_EMULATOR) {
      throw new Error("cleanDatabase can only be run with Firestore emulator");
    }
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error("Firestore emulator host not set");
    }

    console.log("🧹 Cleaning test database...");
    const db = getFirestore();
    const collections = Object.values(COLLECTIONS);
    // console.log("📚 Cleaning test collections:", collections);

    const promises = collections.map(async (collection) => {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      return batch.commit();
    });

    await Promise.all(promises);
    console.log("✨ Test database cleaned successfully");
  } catch (error) {
    console.error("💥 Failed to clean test database:", error);
    throw error;
  }
};
