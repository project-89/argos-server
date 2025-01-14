import fetch, { RequestInit } from "node-fetch";
import { TEST_CONFIG } from "../setup/testConfig";
import { COLLECTIONS } from "../../constants/collections";
import { getFirestore } from "firebase-admin/firestore";
import { Agent as HttpAgent } from "http";

// Create a custom agent with a small keepAlive timeout
const agent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 100,
  maxSockets: 1,
});

/**
 * Destroy the HTTP agent to clean up any remaining connections
 */
export const destroyAgent = () => {
  agent.destroy();
};

interface TestDataOptions {
  roles?: string[];
  isAdmin?: boolean;
}

export const makeRequest = async (config: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
}) => {
  console.log(`🔵 Making ${config.method.toUpperCase()} request to ${config.url}`);

  try {
    const requestConfig: RequestInit = {
      method: config.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
        ...config.headers,
      },
      body: config.data ? JSON.stringify(config.data) : undefined,
      agent, // Use our custom agent
    };

    console.log(`📤 Request config:`, {
      method: config.method,
      url: config.url,
      headers: requestConfig.headers,
      data: config.data,
    });

    const response = await fetch(config.url, requestConfig);
    const data = await response.json();

    console.log(`📥 Response:`, {
      status: response.status,
      statusText: response.statusText,
      data,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } catch (error) {
    console.error(`❌ Request failed:`, error);
    throw error;
  }
};

/**
 * Create test data for endpoints
 */
export const createTestData = async (options: TestDataOptions = {}) => {
  console.log("Creating test data...");

  // Register fingerprint
  const fingerprint = `test-fingerprint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fingerprintResponse = await makeRequest({
    method: "post",
    url: `${TEST_CONFIG.apiUrl}/fingerprint/register`,
    data: {
      fingerprint,
      metadata: {
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
  console.log("Created API key");

  console.log("Test data created successfully");
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
    console.log("📚 Cleaning test collections:", collections);

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
