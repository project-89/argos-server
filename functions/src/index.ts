import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { auth } from "./middleware/auth.middleware";
import { rateLimit } from "./middleware/rateLimit.middleware";
import { CORS_CONFIG } from "./constants/config";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Get allowed origins dynamically
    const allowedOrigins = CORS_CONFIG.getAllowedOrigins();

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: CORS_CONFIG.options.credentials,
  methods: CORS_CONFIG.options.methods,
  allowedHeaders: CORS_CONFIG.options.allowedHeaders,
  maxAge: CORS_CONFIG.options.maxAge,
  preflightContinue: CORS_CONFIG.options.preflightContinue,
  optionsSuccessStatus: CORS_CONFIG.options.optionsSuccessStatus,
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

app.use(express.json());

// Import endpoints
import * as fingerprint from "./endpoints/fingerprint.endpoint";
import * as visit from "./endpoints/visit.endpoint";
import * as role from "./endpoints/role.endpoint";
import * as tag from "./endpoints/tag.endpoint";
import * as apiKey from "./endpoints/apiKey.endpoint";
import * as price from "./endpoints/price.endpoint";
import * as debug from "./endpoints/debug.endpoint";
import * as realityStability from "./endpoints/realityStability.endpoint";

// Register routes directly on the app
// Public routes
app.post("/fingerprint/register", fingerprint.register);
app.post("/api-key/register", apiKey.register);
app.post("/api-key/validate", apiKey.validate);
app.post("/api-key/revoke", apiKey.revoke);
app.get("/role/available", role.getAvailable);
app.get("/price/current", price.getCurrent);
app.get("/price/history/:tokenId", price.getHistory);
app.get("/reality-stability", realityStability.getRealityStabilityIndex);
app.post("/visit/log", visit.log);

// Auth middleware for protected routes
app.use(auth);

// Skip rate limiting in test mode
if (process.env.NODE_ENV !== "test") {
  app.use(rateLimit());
}

// Protected routes
app.get("/fingerprint/:id", fingerprint.get);
app.post("/visit/presence", visit.updatePresence);
app.post("/visit/site/remove", visit.removeSite);
app.get("/visit/history/:fingerprintId", visit.getHistory);
app.post("/role/assign", role.assign);
app.post("/role/remove", role.remove);
app.post("/tag/update", tag.addOrUpdateTags);
app.post("/tag/roles/update", tag.updateRolesBasedOnTags);
app.post("/debug/cleanup", debug.cleanup);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);
