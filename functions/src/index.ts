import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { validateApiKeyMiddleware } from "./middleware/auth.middleware";
import { ipRateLimit } from "./middleware/ipRateLimit.middleware";
import { fingerprintRateLimit } from "./middleware/fingerprintRateLimit.middleware";
import { CORS_CONFIG } from "./constants/config";

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

// Apply global middleware
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("[CORS] Request from origin:", origin);
      if (!origin) {
        // Allow requests with no origin (like mobile apps or curl requests)
        console.log("[CORS] No origin, allowing request");
        callback(null, true);
        return;
      }

      const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
      console.log("[CORS] Checking origin against allowed list:", { origin, allowedOrigins });
      if (allowedOrigins.includes(origin)) {
        console.log("[CORS] Origin allowed:", origin);
        callback(null, origin);
      } else {
        console.error(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: CORS_CONFIG.options.methods,
    allowedHeaders: CORS_CONFIG.options.allowedHeaders,
    maxAge: CORS_CONFIG.options.maxAge,
    preflightContinue: CORS_CONFIG.options.preflightContinue,
    optionsSuccessStatus: CORS_CONFIG.options.optionsSuccessStatus,
  }),
);
app.use(express.json());
app.use(ipRateLimit());

// Public routes (no auth required)
app.use("/", publicRouter);

// Auth middleware for protected routes
app.use(validateApiKeyMiddleware);

// Apply fingerprint rate limit after auth
app.use(fingerprintRateLimit());

// Protected routes (require auth)
app.use("/", protectedRouter);

// Admin routes (require auth + admin role)
app.use("/admin", adminRouter);

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  app,
);

// Export the scheduled cleanup function
export * from "./scheduled/cleanup.scheduled";
