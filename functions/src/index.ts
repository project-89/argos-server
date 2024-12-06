import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Import middleware
import { validateApiKeyMiddleware } from "./middleware/auth.middleware";
import { rateLimit } from "./middleware/rateLimit.middleware";

// Import endpoints
import * as apiKey from "./endpoints/apiKey.endpoint";
import * as fingerprint from "./endpoints/fingerprint.endpoint";
import * as price from "./endpoints/price.endpoint";
import * as realityStability from "./endpoints/realityStability.endpoint";
import * as role from "./endpoints/role.endpoint";
import * as tag from "./endpoints/tag.endpoint";
import * as visit from "./endpoints/visit.endpoint";
import * as debug from "./endpoints/debug.endpoint";

// Import scheduled functions
export { scheduledCleanup } from "./scheduled/cleanup.scheduled";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(validateApiKeyMiddleware);
app.use(rateLimit());

// API Key routes
app.post("/apiKey/register", apiKey.register);
app.post("/apiKey/validate", apiKey.validate);
app.post("/apiKey/revoke", apiKey.revoke);

// Fingerprint routes
app.post("/fingerprint/register", fingerprint.register);
app.get("/fingerprint/:id", fingerprint.get);

// Price routes
app.get("/price/current", price.getCurrent);
app.get("/price/history/:tokenId", price.getHistory);

// Reality Stability routes
app.get("/reality-stability", realityStability.getRealityStabilityIndex);

// Role routes
app.post("/role/assign", role.assign);
app.post("/role/remove", role.remove);
app.get("/role/available", role.getAvailable);

// Tag routes
app.post("/tag/update", tag.addOrUpdateTags);
app.post("/tag/roles/update", tag.updateRolesBasedOnTags);

// Visit routes
app.post("/visit/log", visit.log);
app.post("/visit/presence", visit.updatePresence);
app.post("/visit/site/remove", visit.removeSite);
app.get("/visit/history/:fingerprintId", visit.getHistory);

// Debug routes (protected by API key)
app.post("/debug/cleanup", debug.cleanup);

// Export the Express app as a Firebase Function
export const api = onRequest(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "us-central1",
  },
  app,
);
