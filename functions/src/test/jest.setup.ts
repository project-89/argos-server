import { initializeTestEnvironment } from "./testUtils";

// Extend the timeout for all tests
jest.setTimeout(180000);

// Set up global beforeAll hook
beforeAll(async () => {
  await initializeTestEnvironment();
});

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup if needed
  await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay to ensure all operations are complete
});

// Make commonly used test utilities available globally
declare global {
  var __FIREBASE_FUNCTIONS_EMULATOR: boolean;
  var __FIREBASE_FIRESTORE_EMULATOR: boolean;
}

// Set global emulator flags
globalThis.__FIREBASE_FUNCTIONS_EMULATOR = true;
globalThis.__FIREBASE_FIRESTORE_EMULATOR = true;
