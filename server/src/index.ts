import { config } from "dotenv";
import path from "path";

// Load environment variables based on NODE_ENV first
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
config({ path: path.resolve(__dirname, "../", envFile) });

console.log("Environment loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
  IP_RATE_LIMIT_DISABLED: process.env.IP_RATE_LIMIT_DISABLED,
});

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";

import { errorHandler } from "./middleware";
import { configureCORS, corsErrorHandler } from "./middleware/global.middleware";
import { configureAPI } from "./constants/config/api";
import { withMetrics, ipRateLimit } from "./middleware";
import { HEALTH_RATE_LIMIT_CONFIG, initializeRateLimits } from "./constants/config/limits";
import routes from "./routes";
import { initDatabases } from "./utils";

// Initialize databases (MongoDB & Firebase)
initDatabases().catch((err) => {
  console.error("Failed to initialize databases:", err);
  process.exit(1);
});

// Initialize Firebase Admin (to be removed after migration)
admin.initializeApp();

// Create Express app
const app = express();

// Configure CORS
configureCORS(app);

// Initialize rate limits
initializeRateLimits();

// Configure health endpoint rate limiting
const healthMiddleware = withMetrics(ipRateLimit(HEALTH_RATE_LIMIT_CONFIG), "healthIpRateLimit");

// Apply health check rate limiting
app.use("/health", healthMiddleware);
app.use("/metrics", healthMiddleware);

// Configure API basics (body parser, static files, etc)
configureAPI(app);

// Mount all routes
app.use("/api", routes);

// Register error handlers
app.use(corsErrorHandler);
app.use(errorHandler);

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(
  {
    cors: false, // Disable Firebase's CORS handling (we handle it ourselves)
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 100,
    concurrency: 80,
    cpu: 1,
    region: "us-central1",
    labels: {
      deployment: "production",
    },
  },
  app,
);

// Export the scheduled cleanup function
export * from "./scheduled/cleanup.scheduled";
