import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { validateApiKeyMiddleware } from "./middleware/auth.middleware";
import { ipRateLimit } from "./middleware/ipRateLimit.middleware";
import { fingerprintRateLimit } from "./middleware/fingerprintRateLimit.middleware";
import { CORS_CONFIG } from "./constants/config";
import path from "path";

// Import routers
import publicRouter from "./routes/public.router";
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

// Helper to send error response
const sendErrorResponse = (
  res: express.Response,
  statusCode: number,
  browserFile: string,
  apiError: { success: false; error: string; message: string },
) => {
  if (isBrowserRequest(res.req)) {
    res.status(statusCode).sendFile(path.join(__dirname, "public", browserFile));
  } else {
    res.status(statusCode).json(apiError);
  }
};

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

// Public routes (no auth required)
app.use("/", publicRouter);

// Apply rate limiting before auth
app.use(ipRateLimit());

// Custom auth middleware that bypasses certain paths
app.use((req, res, next) => {
  // List of paths that should bypass auth
  const bypassPaths = ["/error", "/nonexistent"];
  if (bypassPaths.includes(req.path)) {
    return next();
  }
  return validateApiKeyMiddleware(req, res, next);
});

// Test error route
app.get("/error", (req, res) => {
  sendErrorResponse(res, 500, "500.html", {
    success: false,
    error: "Internal Server Error",
    message: "A quantum fluctuation has been detected in the reality processing matrix",
  });
});

// Apply fingerprint rate limit after auth
app.use(fingerprintRateLimit());

// Protected routes (require auth)
app.use("/", protectedRouter);

// Admin routes (require auth + admin role)
app.use("/admin", adminRouter);

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

// 404 handler for any remaining routes
app.use((req, res) => {
  sendErrorResponse(res, 404, "404.html", {
    success: false,
    error: "Not Found",
    message: "The requested endpoint does not exist",
  });
});

// Generic error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Error Handler]", err);
  return sendErrorResponse(res, 500, "500.html", {
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
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
