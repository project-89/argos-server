import "./register";
import * as functions from "firebase-functions";
import express, { Request, Response } from "express";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
import { validateApiKeyMiddleware } from "./middleware/auth";
import { getRealityStabilityIndex } from "./endpoints/realityStabilityIndex";
import { getTokenPriceEndpoint, getCurrentPricesEndpoint } from "./endpoints/priceEndpoints";
import { registerFingerprint, getFingerprint } from "./endpoints/fingerprintManagement";
import { logVisit, updatePresence, removeSite } from "./endpoints/visitLogger";
import { assignRole, removeRole, getAvailableRoles } from "./endpoints/roleManagement";
import { addOrUpdateTags, updateRolesBasedOnTags } from "./endpoints/tagManagement";
import { registerApiKeyEndpoint } from "./endpoints/apiKeyManagement";
import { getVisitHistory } from "./endpoints/visitHistory";

// Initialize Firebase Admin
initializeApp();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(validateApiKeyMiddleware);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Reality Stability Endpoints
app.get("/reality-stability", getRealityStabilityIndex);

// Price Endpoints
app.get("/price/:tokenId", getTokenPriceEndpoint);
app.get("/prices", getCurrentPricesEndpoint);

// Fingerprint Management
app.post("/fingerprint", registerFingerprint);
app.get("/fingerprint/:id", getFingerprint);

// Visit Tracking
app.post("/visit", logVisit);
app.post("/presence", updatePresence);
app.delete("/presence/site", removeSite);
app.get("/visit-history", getVisitHistory);

// Role Management
app.post("/role", assignRole);
app.delete("/role", removeRole);
app.get("/roles", getAvailableRoles);

// Tag Management
app.post("/tags", addOrUpdateTags);
app.post("/tags/roles", updateRolesBasedOnTags);

// API Key Management
app.post("/api-key", registerApiKeyEndpoint);

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);
