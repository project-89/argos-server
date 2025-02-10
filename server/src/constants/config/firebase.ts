export const FIREBASE_CONFIG = {
  region: "us-central1",
  timeoutSeconds: 60,
} as const;

export type FirebaseConfig = typeof FIREBASE_CONFIG;
