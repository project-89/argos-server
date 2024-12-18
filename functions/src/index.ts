import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { auth } from "./middleware/auth.middleware";
import { ipRateLimit } from "./middleware/ipRateLimit.middleware";
import { fingerprintRateLimit } from "./middleware/fingerprintRateLimit.middleware";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Apply middleware
app.use(cors());
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
app.post("/fingerprint/register", fingerprint.register);
app.post("/api-key/register", apiKey.register);
app.post("/api-key/validate", apiKey.validate);
app.get("/role/available", role.getAvailable);
app.get("/price/current", price.getCurrent);
app.get("/price/history/:tokenId", price.getHistory);
app.get("/reality-stability", realityStability.getRealityStabilityIndex);

// Apply fingerprint rate limit to all routes that need it
app.use("/visit/*", fingerprintRateLimit());

// Auth middleware for protected routes
app.use(auth);

// Protected routes
app.get("/fingerprint/:id", fingerprint.get);
app.post("/visit/log", visit.log);
app.post("/visit/presence", visit.updatePresence);
app.post("/visit/site/remove", visit.removeSite);
app.get("/visit/history/:fingerprintId", visit.getHistory);
app.post("/role/assign", role.assign);
app.post("/role/remove", role.remove);
app.post("/tag/update", tag.addOrUpdateTags);
app.post("/tag/roles/update", tag.updateRolesBasedOnTags);
app.post("/debug/cleanup", debug.cleanup);
app.post("/api-key/revoke", apiKey.revoke);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);
