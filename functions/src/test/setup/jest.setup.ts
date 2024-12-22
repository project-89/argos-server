import { jest, beforeAll, afterAll } from "@jest/globals";
import { initializeTestEnvironment, cleanDatabase } from "../utils/testUtils";
import { TEST_CONFIG } from "./testConfig";
import * as admin from "firebase-admin";
import axios from "axios";

// Set test environment variables
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "argos-434718",
});

// Set encryption config for testing using production format
process.env.FIREBASE_CONFIG_ENCRYPTION_API_KEY = "a0PJ2Y5qjvkL7LVmer6f1OACff+0kMjMPOJ5YkGS+JM=";
process.env.FIREBASE_CONFIG_ENCRYPTION_API_IV = "G3z5x+kLY3xFOrfaQUuhnA=";

// Set rate limit environment variables for testing
process.env.RATE_LIMIT_ENABLED = "true";
process.env.IP_RATE_LIMIT_ENABLED = "false";

// Set CORS environment variables for testing
process.env.ALLOWED_ORIGINS = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // React dev server
  "http://localhost:5000", // Firebase emulator
  "https://test.com",
  "https://example.com",
  "https://newsite.com",
].join(",");

// Set test environment
process.env.NODE_ENV = "test";

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

// Remove default CORS headers from axios config as they're handled by the server
delete axios.defaults.headers.common["Access-Control-Allow-Origin"];
delete axios.defaults.headers.common["Access-Control-Allow-Methods"];
delete axios.defaults.headers.common["Access-Control-Allow-Headers"];
delete axios.defaults.headers.common["Access-Control-Request-Headers"];
delete axios.defaults.headers.common["Access-Control-Request-Method"];

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
