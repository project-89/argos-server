// Load test environment variables
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import path from "path";
import { cleanDatabase } from "../utils/testUtils";

// Declare global Firebase initialization flag
declare global {
  var __FIREBASE_INITIALIZED__: boolean;
}

// Load test environment variables first
config({ path: path.resolve(__dirname, "../../../.env.test") });

// Set emulator host before initialization
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

// Initialize Firebase Admin if not already initialized
if (!global.__FIREBASE_INITIALIZED__) {
  console.log("Initializing Firebase Admin...");
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
  global.__FIREBASE_INITIALIZED__ = true;
  console.log("Firebase Admin initialized");
}

// Configure Jest
beforeAll(async () => {
  // Log environment setup
  console.log("Test environment setup:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
  console.log("- FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);

  // Verify Firestore emulator connection
  try {
    const db = getFirestore();
    console.log("Testing emulator connection...");
    const testDoc = await db.collection("_test").add({
      timestamp: new Date(),
      test: true,
    });
    await testDoc.delete();
    console.log("✓ Successfully connected to Firestore emulator");
  } catch (error) {
    console.error("✗ Failed to connect to Firestore emulator:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    await cleanDatabase();
  } catch (error) {
    console.error("Error in afterEach:", error);
  }
});
