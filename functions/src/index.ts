import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { auth } from "./middleware/auth.middleware";
import { ipRateLimit } from "./middleware/ipRateLimit.middleware";
import { fingerprintRateLimit } from "./middleware/fingerprintRateLimit.middleware";
import { CORS_CONFIG } from "./constants/config";

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
app.post("/fingerprint/register", ...fingerprint.register);
app.post("/api-key/register", ...apiKey.register);
app.post("/api-key/validate", ...apiKey.validate);
app.get("/role/available", role.getAvailableRoles);
app.get("/price/current", ...price.getCurrent);
app.get("/price/history/:tokenId", ...price.getHistory);
app.get("/reality-stability", realityStability.getRealityStabilityIndex);

// Auth middleware for protected routes
app.use(auth);

// Apply fingerprint rate limit after auth
app.use(fingerprintRateLimit());

// Protected routes
app.get("/fingerprint/:id", fingerprint.get);
app.post("/visit/log", ...visit.log);
app.post("/visit/presence", ...visit.updatePresence);
app.post("/visit/site/remove", ...visit.removeSite);
app.get("/visit/history/:fingerprintId", ...visit.getHistory);
app.post("/role/assign", ...role.assignRole);
app.post("/role/remove", ...role.removeRole);
app.post("/tag/update", ...tag.addOrUpdateTags);
app.post("/tag/roles/update", ...tag.updateRolesBasedOnTags);
app.post("/debug/cleanup", debug.cleanup);
app.post("/api-key/revoke", ...apiKey.revoke);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);
