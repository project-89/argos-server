import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as visit from "../endpoints/visit.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as impression from "../endpoints/impression.endpoint";
import * as tag from "../endpoints/tag.endpoint";
import presence from "../endpoints/presence.endpoint";
import { verifyOwnership } from "../middleware/ownershipCheck.middleware";
import * as profile from "../endpoints/profile.endpoint";

const protectedRouter = Router();

// Fingerprint operations
protectedRouter.get("/fingerprint/:id", verifyOwnership, fingerprint.get);
protectedRouter.post("/fingerprint/update", verifyOwnership, ...fingerprint.update);

// Visit tracking - require ownership
protectedRouter.post("/visit", verifyOwnership, ...visit.log);
protectedRouter.post("/visit/presence", verifyOwnership, ...visit.updatePresence);
protectedRouter.post("/visit/remove-site", verifyOwnership, ...visit.removeSite);
protectedRouter.get("/visit/history/:fingerprintId", verifyOwnership, ...visit.getHistory);

// API key management - require ownership
protectedRouter.post("/api-key/revoke", verifyOwnership, ...apiKey.revoke);

// Impression endpoints - require ownership
protectedRouter.post("/impressions", verifyOwnership, ...impression.create);
protectedRouter.get("/impressions/:fingerprintId", verifyOwnership, ...impression.get);
protectedRouter.delete("/impressions/:fingerprintId", verifyOwnership, ...impression.remove);

// Presence tracking - require ownership
protectedRouter.use("/presence", presence);

// Tag game endpoints

// Public competitive endpoints - just need valid API key
protectedRouter.post("/tag", ...tag.tagUser); // Tag other users
protectedRouter.get("/tag/leaderboard", ...tag.getLeaderboard); // Public leaderboard data

// Personal tag data - requires ownership verification
protectedRouter.get("/tag/user/:fingerprintId", verifyOwnership, ...tag.getUserTags);
protectedRouter.get("/tag/history/:fingerprintId", verifyOwnership, ...tag.getTagHistory);
protectedRouter.get("/tag/check/:fingerprintId/:tagType", verifyOwnership, ...tag.checkTag);

// Profile routes
protectedRouter.post("/profile", ...profile.createProfile);
protectedRouter.get("/profile/:id", ...profile.getProfile);
protectedRouter.get("/profile/wallet/:walletAddress", ...profile.getProfileByWallet);
protectedRouter.patch("/profile/:id", ...profile.updateProfile);

export default protectedRouter;
