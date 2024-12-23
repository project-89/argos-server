import { Router } from "express";
import * as fingerprint from "../endpoints/fingerprint.endpoint";
import * as apiKey from "../endpoints/apiKey.endpoint";
import * as role from "../endpoints/role.endpoint";
import * as price from "../endpoints/price.endpoint";
import * as realityStability from "../endpoints/realityStability.endpoint";

const publicRouter = Router();

// Fingerprint registration
publicRouter.post("/fingerprint/register", ...fingerprint.register);

// API key management
publicRouter.post("/api-key/register", ...apiKey.register);
publicRouter.post("/api-key/validate", ...apiKey.validate);

// Role information
publicRouter.get("/role/available", role.getAvailableRoles);

// Price endpoints
publicRouter.get("/price/current", ...price.getCurrent);
publicRouter.get("/price/history/:tokenId", ...price.getHistory);

// Reality stability
publicRouter.get("/reality-stability", ...realityStability.getRealityStabilityIndex);

export default publicRouter;
