import { jest, beforeAll, afterAll } from "@jest/globals";
import { initializeTestEnvironment, cleanDatabase, createTestData } from "../utils/testUtils";
import { TEST_CONFIG } from "./testConfig";
import * as admin from "firebase-admin";
import axios from "axios";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __MONGO_URI__: string;
      __MONGO_DB_NAME__: string;
    }
  }
}

// Set test environment
process.env.NODE_ENV = "test";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: TEST_CONFIG.projectId,
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: TEST_CONFIG.projectId,
  });
}

// Increase Jest timeout
jest.setTimeout(60000);

// Set up global beforeAll hook
beforeAll(async () => {
  console.log("Setting up test environment...");
  try {
    // Initialize test environment
    await initializeTestEnvironment();

    // Create test data
    await createTestData();

    // Configure axios defaults
    axios.defaults.baseURL = TEST_CONFIG.apiUrl;
    axios.defaults.headers.common["x-api-key"] = TEST_CONFIG.mockApiKey;
    axios.defaults.headers.common["x-test-env"] = "true";
    axios.defaults.headers.common["x-test-fingerprint-id"] = TEST_CONFIG.testFingerprint.id;

    console.log("Test environment setup complete");
  } catch (error) {
    console.error("Failed to setup test environment:", error);
    throw error;
  }
});

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
