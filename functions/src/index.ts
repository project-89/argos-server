import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { auth } from "./middleware/auth.middleware";
import { rateLimit } from "./middleware/rateLimit.middleware";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
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
