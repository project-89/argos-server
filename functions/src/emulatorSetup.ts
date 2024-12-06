import "./register";
import * as admin from "firebase-admin";

// Environment configuration
export const CONFIG = {
  projectId: "argos-dev",
  firestoreEmulator: "localhost:9090",
};

// Initialize Firebase Admin
export const initializeEmulator = async () => {
  try {
    // Set environment variables
    process.env.FIRESTORE_EMULATOR_HOST = CONFIG.firestoreEmulator;
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: CONFIG.projectId,
    });
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.GCLOUD_PROJECT = CONFIG.projectId;

    // Initialize admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: CONFIG.projectId,
      });
    }

    return admin.firestore();
  } catch (error) {
    console.error("Failed to initialize emulator:", error);
    throw error;
  }
};
