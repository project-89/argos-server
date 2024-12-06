import { jest, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { initializeTestEnvironment, cleanDatabase } from "../utils/testUtils";
import { TEST_CONFIG } from "./testConfig";

// Set test environment
process.env.NODE_ENV = "test";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = TEST_CONFIG.firestoreEmulator;

// Set up global beforeAll hook
beforeAll(async () => {
  await initializeTestEnvironment();
});

// Clean up after all tests
afterAll(async () => {
  await cleanDatabase();
  // Small delay to ensure all operations are complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Clean database before each test
beforeEach(async () => {
  await cleanDatabase();
});

// Configure longer timeout for all tests
jest.setTimeout(TEST_CONFIG.defaultTimeout);

// Make commonly used test utilities available globally
declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_FUNCTIONS_EMULATOR: boolean;
  // eslint-disable-next-line no-var
  var __FIREBASE_FIRESTORE_EMULATOR: boolean;
}

// Set global emulator flags
globalThis.__FIREBASE_FUNCTIONS_EMULATOR = true;
globalThis.__FIREBASE_FIRESTORE_EMULATOR = true;
