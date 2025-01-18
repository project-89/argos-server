import { Router } from "express";
import { requireAdmin } from "../middleware/roleCheck.middleware";
import { validateApiKeyMiddleware } from "../middleware/auth.middleware";
import * as role from "../endpoints/role.endpoint";

const adminRouter = Router();

// ROLE management routes - apply auth and admin check per route
adminRouter.post("/role/assign", validateApiKeyMiddleware, requireAdmin, ...role.assignRole);
adminRouter.post("/role/remove", validateApiKeyMiddleware, requireAdmin, ...role.removeRole);

export default adminRouter;
