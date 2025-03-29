import { config } from "dotenv";
import path from "path";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { setupRateLimiter } from "./middleware/rateLimiter.middleware";
import { errorHandler } from "./middleware/error.middleware";
import router from "./routes";
import { initDatabases } from "./utils";
import { setupScheduledTasks } from "./scheduled";
import { initializeMCPSystem } from "./mcp.system";

// Load environment variables based on NODE_ENV first
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
config({ path: path.resolve(__dirname, "../", envFile) });

console.log("Environment loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
  IP_RATE_LIMIT_DISABLED: process.env.IP_RATE_LIMIT_DISABLED,
});

import { configureCORS, corsErrorHandler } from "./middleware/global.middleware";
import { configureAPI } from "./constants/config/api";
import { withMetrics, ipRateLimit } from "./middleware";
import { HEALTH_RATE_LIMIT_CONFIG, initializeRateLimits } from "./constants/config/limits";

// Initialize MongoDB database
initDatabases().catch((err) => {
  console.error("Failed to initialize databases:", err);
  process.exit(1);
});

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(setupRateLimiter);

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
app.use("/api", router);

// Register error handlers
app.use(corsErrorHandler);
app.use(errorHandler);

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Create server
const server = http.createServer(app);

// Start the server
async function startServer() {
  try {
    // Initialize databases
    await initDatabases();

    // Initialize the MCP system
    await initializeMCPSystem();

    // Setup scheduled tasks
    setupScheduledTasks();

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

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
