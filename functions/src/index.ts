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
import cors from "cors";
import { validateApiKeyMiddleware } from "./middleware/auth.middleware";
import { ipRateLimit } from "./middleware/ipRateLimit.middleware";
import { fingerprintRateLimit } from "./middleware/fingerprintRateLimit.middleware";
import { CORS_CONFIG } from "./constants/config";
import { composeMiddleware } from "./middleware/compose";
import { MiddlewareConfig } from "./middleware/config";
import { withMetrics } from "./middleware/metrics";
import { errorHandler } from "./middleware/error.middleware";
import { ApiError } from "./utils/error";
import { ERROR_MESSAGES } from "./constants/api";
import { sendError } from "./utils/response";

// Import routers
import { publicRouter } from "./routes/public.router";
import protectedRouter from "./routes/protected.router";
import adminRouter from "./routes/admin.router";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Debug log CORS configuration
const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
console.log("[CORS] Allowed origins:", allowedOrigins);
console.log("[CORS] Options:", CORS_CONFIG.options);

// Add explicit OPTIONS handler for preflight requests FIRST
app.options(
  "*",
  cors({
    origin: (origin, callback) => {
      console.log("[CORS] Preflight request from origin:", origin);
      const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || "*");
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: [...CORS_CONFIG.options.methods],
    allowedHeaders: [...CORS_CONFIG.options.allowedHeaders],
    exposedHeaders: [...CORS_CONFIG.options.exposedHeaders],
    maxAge: CORS_CONFIG.options.maxAge,
  }),
);

// Apply CORS middleware for all other requests
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("[CORS] Request from origin:", origin);

      // For requests without an origin, allow with "*" if not using credentials
      if (!origin) {
        console.log("[CORS] Request without origin - allowing for non-credentialed requests");
        callback(null, "*");
        return;
      }

      const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
      console.log("[CORS] Checking origin against allowed list:", { origin, allowedOrigins });

      if (allowedOrigins.includes(origin)) {
        // For credentialed requests, must return the specific origin
        console.log("[CORS] Origin allowed:", origin);
        callback(null, origin);
      } else {
        console.error(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        // Return error to trigger CORS failure
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: [...CORS_CONFIG.options.methods],
    allowedHeaders: [...CORS_CONFIG.options.allowedHeaders],
    exposedHeaders: [...CORS_CONFIG.options.exposedHeaders],
    maxAge: CORS_CONFIG.options.maxAge,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());

// Helper to check if request is from a browser
const isBrowserRequest = (req: express.Request): boolean => {
  const accept = req.headers.accept || "";
  return accept.includes("text/html") || accept.includes("*/*");
};

// Initialize middleware configuration
const middlewareConfig = MiddlewareConfig.getInstance();

// Configure rate limits (can be changed at runtime)
middlewareConfig.set("rateLimit.ip", {
  windowMs: 60 * 60 * 1000,
  max: process.env.IP_RATE_LIMIT_MAX ? parseInt(process.env.IP_RATE_LIMIT_MAX) : 300,
});

middlewareConfig.set("rateLimit.fingerprint", {
  windowMs: 60 * 60 * 1000,
  max: process.env.FINGERPRINT_RATE_LIMIT_MAX
    ? parseInt(process.env.FINGERPRINT_RATE_LIMIT_MAX)
    : 1000,
});

middlewareConfig.set("rateLimit.health", {
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // 1 request per second on average
});

// Health check rate limiting (lenient but protected)
const healthMiddleware = composeMiddleware(
  withMetrics(ipRateLimit(middlewareConfig.get("rateLimit.health")), "healthIpRateLimit"),
);

// Public endpoints rate limiting (more restrictive)
const publicMiddleware = composeMiddleware(
  withMetrics(
    ipRateLimit({
      ...middlewareConfig.get("rateLimit.ip"),
      max: 100, // More restrictive for public endpoints
    }),
    "publicIpRateLimit",
  ),
);

// Protected routes rate limiting
const protectedMiddleware = composeMiddleware(
  // IP Rate Limit first - most broad check
  withMetrics(ipRateLimit(middlewareConfig.get("rateLimit.ip")), "protectedIpRateLimit"),
  // Then API Key validation which sets fingerprintId
  withMetrics(validateApiKeyMiddleware, "auth"),
  // Then Fingerprint rate limit which uses fingerprintId
  withMetrics(
    fingerprintRateLimit(middlewareConfig.get("rateLimit.fingerprint")),
    "fingerprintRateLimit",
  ),
);

// Apply health check rate limiting
app.use("/health", healthMiddleware);
app.use("/metrics", healthMiddleware);

// Serve landing page only for browser requests to root
app.get("/", (req, res) => {
  if (isBrowserRequest(req)) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.json({
      name: "Argos API",
      version: "1.0.0",
      status: "operational",
      documentation: "Visit https://argos.project89.org in a browser for documentation",
    });
  }
});

// Public routes (with rate limiting but no auth)
app.use("/", publicMiddleware, publicRouter);

// Protected routes (with auth and rate limiting)
app.use("/", protectedMiddleware, protectedRouter);

// Admin routes (with auth and rate limiting)
app.use("/admin", protectedMiddleware, adminRouter);

// CORS error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): express.Response | void => {
    if (err.message === "Not allowed by CORS") {
      console.error("[CORS Error]", err.message);
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Not allowed by CORS",
      });
    }
    next(err);
  },
);

// Register error handler middleware
app.use(errorHandler);

// 404 handler for any remaining routes
app.use((req, res) => {
  if (isBrowserRequest(req)) {
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  } else {
    sendError(res, new ApiError(404, ERROR_MESSAGES.NOT_FOUND));
  }
});

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(
  {
    cors: false, // Disable Firebase's CORS handling
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
