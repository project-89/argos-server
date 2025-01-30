import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as role from "../endpoints/role.endpoint";
import * as price from "../endpoints/price.endpoint";
import * as realityStability from "../endpoints/realityStability.endpoint";
import * as tag from "../endpoints/tag.endpoint";
import { sendSuccess } from "../utils/response";

const router = Router();

// Health check endpoint
router.get("/health", (_, res) => {
  sendSuccess(res, {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Mount public endpoints
router.post("/fingerprint/register", ...fingerprint.register);
router.post("/api-key/register", ...apiKey.register);
router.post("/api-key/validate", ...apiKey.validate);
router.get("/role/available", ...role.getAvailableRoles);
router.get("/price/current", ...price.getCurrent);
router.get("/price/history/:tokenId", ...price.getHistory);
router.get("/reality-stability", ...realityStability.getRealityStabilityIndex);

// Tag game endpoints
router.post("/tag", ...tag.tagUser); // Tag other users
router.get("/tag/leaderboard", ...tag.getLeaderboard); // Public leaderboard data

export { router as publicRouter };
