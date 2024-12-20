import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as visit from "../endpoints/visit.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as role from "../endpoints/role.endpoint";

const protectedRouter = Router();

// Fingerprint operations
protectedRouter.get("/fingerprint/:id", fingerprint.get);

// Visit tracking
protectedRouter.post("/visit/log", ...visit.log);
protectedRouter.post("/visit/presence", ...visit.updatePresence);
protectedRouter.post("/visit/site/remove", ...visit.removeSite);
protectedRouter.get("/visit/history/:fingerprintId", ...visit.getHistory);

// API key management
protectedRouter.post("/api-key/revoke", ...apiKey.revoke);

// Role information
protectedRouter.get("/role/available", role.getAvailableRoles);

export default protectedRouter;
