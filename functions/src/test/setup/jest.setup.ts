import { jest, beforeAll, afterAll } from "@jest/globals";
import { initializeTestEnvironment, cleanDatabase } from "../utils/testUtils";
import { TEST_CONFIG } from "./testConfig";
import * as admin from "firebase-admin";
import axios from "axios";

declare global {
  namespace NodeJS {
    interface Global {
      __MONGO_URI__: string;
      __MONGO_DB_NAME__: string;
    }
  }
}

// Set test environment
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: TEST_CONFIG.projectId,
});

// Set rate limiting to enabled by default for tests
process.env.RATE_LIMIT_ENABLED = "true";

// Initialize CORS environment variables for testing
process.env.DEV_ORIGIN_VITE = "http://localhost:5173";
process.env.DEV_ORIGIN_REACT = "http://localhost:3000";
process.env.DEV_ORIGIN_FIREBASE = "http://localhost:5000";
// Add newsite.com here to match test expectations
process.env.ALLOWED_ORIGINS = "https://test.com,https://example.com,https://newsite.com";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: TEST_CONFIG.projectId,
  });
}

// Set timeout for all tests
jest.setTimeout(TEST_CONFIG.defaultTimeout);

// Initialize test environment before all tests
beforeAll(async () => {
  await initializeTestEnvironment();
});

// Set default axios config for tests
axios.defaults.baseURL = TEST_CONFIG.apiUrl;
axios.defaults.validateStatus = () => true; // Don't throw on any status
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.headers.common["Access-Control-Allow-Origin"] = "*";
axios.defaults.headers.common["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS";
axios.defaults.headers.common["Access-Control-Allow-Headers"] =
  "Content-Type,Authorization,x-api-key";

// Clean up after all tests
afterAll(async () => {
  console.log("Cleaning up test environment...");
  try {
    await cleanDatabase();
    // Small delay to ensure all operations are complete
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Test environment cleanup complete");
  } catch (error) {
    console.error("Failed to cleanup test environment:", error);
    throw error;
  }
});
