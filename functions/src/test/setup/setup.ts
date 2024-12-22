import { config } from "dotenv";
import { resolve } from "path";

// Load test environment variables
config({ path: resolve(__dirname, "../.env.test") });

// Set up test environment
process.env.NODE_ENV = "test";
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "test-project",
  databaseURL: "https://test-project.firebaseio.com",
});

// Set up test encryption keys (32 bytes each, base64 encoded)
process.env.FIREBASE_CONFIG_ENCRYPTION_API_KEY = "dGVzdEtleVRlc3RLZXlUZXN0S2V5VGVzdEtleVRlc3RLZXk="; // 32 bytes
process.env.FIREBASE_CONFIG_ENCRYPTION_API_IV = "dGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2VGVzdEl2"; // 16 bytes

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
}));
