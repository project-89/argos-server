import { config } from "dotenv";
import path from "path";
import express from "express";
import http from "http";

// Load environment variables based on NODE_ENV first
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
config({ path: path.resolve(__dirname, "../", envFile) });

console.log("Environment loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
  IP_RATE_LIMIT_DISABLED: process.env.IP_RATE_LIMIT_DISABLED,
});

import { errorHandler } from "./middleware";
import { configureCORS, corsErrorHandler } from "./middleware/global.middleware";
import { configureAPI } from "./constants/config/api";
import { withMetrics, ipRateLimit } from "./middleware";
import { HEALTH_RATE_LIMIT_CONFIG, initializeRateLimits } from "./constants/config/limits";
import routes from "./routes";
import { initDatabases } from "./utils";
import { setupScheduledTasks } from "./scheduled";

// Initialize MongoDB database
initDatabases().catch((err) => {
  console.error("Failed to initialize databases:", err);
  process.exit(1);
});

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

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Create server
const server = http.createServer(app);

// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  // Setup scheduled tasks after server starts
  setupScheduledTasks();
});

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// For direct execution (not as a module)
if (require.main === module) {
  // Server is already started above
  console.log("Server running in standalone mode");
}

// Export the Express app for testing or programmatic usage
export { app };
