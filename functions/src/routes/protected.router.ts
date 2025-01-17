import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as visit from "../endpoints/visit.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as role from "../endpoints/role.endpoint";
import * as impression from "../endpoints/impression.endpoint";
import * as tag from "../endpoints/tag.endpoint";
import presence from "../endpoints/presence.endpoint";
import { verifyOwnership } from "../middleware/ownershipCheck.middleware";

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

// ROLE information - public within protected routes
protectedRouter.get("/role/available", role.getAvailableRoles);

// Impression endpoints - require ownership
protectedRouter.post("/impressions", verifyOwnership, ...impression.create);
protectedRouter.get("/impressions/:fingerprintId", verifyOwnership, ...impression.get);
protectedRouter.delete("/impressions/:fingerprintId", verifyOwnership, ...impression.remove);

// Presence tracking - require ownership
protectedRouter.use("/presence", presence);

// Tag game endpoints
protectedRouter.post("/tag", verifyOwnership, tag.tagUser);
protectedRouter.get("/tag/user/:fingerprintId", verifyOwnership, tag.getUserTags);
protectedRouter.get("/tag/history/:fingerprintId", verifyOwnership, tag.getTagHistory);
protectedRouter.get("/tag/check/:fingerprintId/:tagType", verifyOwnership, tag.checkTag);

export default protectedRouter;
