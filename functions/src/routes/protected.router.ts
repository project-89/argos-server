import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as visit from "../endpoints/visit.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as role from "../endpoints/role.endpoint";
import * as impression from "../endpoints/impression.endpoint";

const protectedRouter = Router();

// Fingerprint operations
protectedRouter.get("/fingerprint/:id", fingerprint.get);
protectedRouter.post("/fingerprint/update", ...fingerprint.update);

// Visit tracking
protectedRouter.post("/visit/log", ...visit.log);
protectedRouter.post("/visit/presence", ...visit.updatePresence);
protectedRouter.post("/visit/site/remove", ...visit.removeSite);
protectedRouter.get("/visit/history/:fingerprintId", ...visit.getHistory);

// API key management
protectedRouter.post("/api-key/revoke", ...apiKey.revoke);

// ROLE information
protectedRouter.get("/role/available", role.getAvailableRoles);

// Impression endpoints
protectedRouter.post("/impressions", ...impression.create);
protectedRouter.get("/impressions/:fingerprintId", ...impression.get);
protectedRouter.delete("/impressions/:fingerprintId", ...impression.remove);

export default protectedRouter;
