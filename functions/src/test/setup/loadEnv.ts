import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

console.log("🔄 Loading test environment...");

// Construct paths to try
const possiblePaths = [
  path.resolve(__dirname, "../../../.env.test"),
  path.resolve(process.cwd(), ".env.test"),
  path.resolve(process.cwd(), "functions/.env.test"),
];

console.log("📂 Looking for .env.test in:", possiblePaths);

let loaded = false;

// Try loading from each possible path
for (const envPath of possiblePaths) {
  try {
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });

      if (!result.error) {
        console.log("✅ Loaded environment from:", envPath);
        console.log("📊 Environment variables loaded:", Object.keys(result.parsed || {}).length);
        loaded = true;
        break;
      }
    } else {
      console.log("⚠️ File not found:", envPath);
    }
  } catch (error) {
    console.log("⚠️ Failed to load from:", envPath, error);
  }
}

if (!loaded) {
  console.error("❌ Failed to load environment from any path");
  console.error("Current working directory:", process.cwd());
  console.error("Available files in cwd:", fs.readdirSync(process.cwd()));
  process.exit(1);
}

// Verify critical environment variables
const requiredVars = [
  "NODE_ENV",
  "FIREBASE_PROJECT_ID",
  "FIRESTORE_EMULATOR_HOST",
  "FUNCTIONS_EMULATOR",
  "TEST_API_URL",
];

const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error("❌ Missing required environment variables:", missing);
  process.exit(1);
}

console.log("✅ Environment verification complete. Required variables present.");
console.log("🔧 Test configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  TEST_API_URL: process.env.TEST_API_URL,
});
