import { jest, beforeAll, afterAll } from "@jest/globals";
import {
  initializeTestEnvironment,
  cleanDatabase,
  configureAxios,
  createTestData,
} from "../utils/testUtils";
import { TEST_CONFIG } from "./testConfig";
import * as admin from "firebase-admin";
import axios from "axios";

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
  // Initialize test environment
  await initializeTestEnvironment();

  // Create test data
  await createTestData();

  // Configure axios with test headers
  configureAxios();

  // Add default headers for all requests
  axios.defaults.headers.common["x-api-key"] = TEST_CONFIG.mockApiKey;
  axios.defaults.headers.common["x-test-env"] = "true";
  axios.defaults.headers.common["x-test-fingerprint-id"] = TEST_CONFIG.testFingerprint.id;
});

// Clean up after all tests
afterAll(async () => {
  await cleanDatabase();
  // Small delay to ensure all operations are complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});
