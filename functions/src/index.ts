import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { apiKeyAuth, testAuth } from "./middleware/auth.middleware";
import { rateLimit } from "./middleware/rateLimit.middleware";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware - API key auth first, then test auth
app.use(apiKeyAuth);
app.use(testAuth);

// Skip rate limiting in test mode
if (process.env.NODE_ENV !== "test") {
  app.use(rateLimit());
}

// Import endpoints
import * as fingerprint from "./endpoints/fingerprint.endpoint";
import * as visit from "./endpoints/visit.endpoint";
import * as role from "./endpoints/role.endpoint";
import * as tag from "./endpoints/tag.endpoint";
import * as apiKey from "./endpoints/apiKey.endpoint";
import * as price from "./endpoints/price.endpoint";
import * as debug from "./endpoints/debug.endpoint";
import * as realityStability from "./endpoints/realityStability.endpoint";

// Register routes
app.post("/fingerprint/register", fingerprint.register);
app.get("/fingerprint/:id", fingerprint.get);

app.post("/visit/log", visit.log);
app.post("/visit/presence", visit.updatePresence);
app.post("/visit/site/remove", visit.removeSite);
app.get("/visit/history/:fingerprintId", visit.getHistory);

app.post("/role/assign", role.assign);
app.post("/role/remove", role.remove);
app.get("/role/available", role.getAvailable);

app.post("/tag/update", tag.addOrUpdateTags);
app.post("/tag/roles/update", tag.updateRolesBasedOnTags);

app.post("/apiKey/register", apiKey.register);
app.post("/apiKey/validate", apiKey.validate);
app.post("/apiKey/revoke", apiKey.revoke);

app.get("/price/current", price.getCurrent);
app.get("/price/history/:tokenId", price.getHistory);

app.post("/debug/cleanup", debug.cleanup);

app.get("/reality-stability", realityStability.getRealityStabilityIndex);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);
