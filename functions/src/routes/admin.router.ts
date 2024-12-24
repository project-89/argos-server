import { Router } from "express";
import { requireAdmin } from "../middleware/roleCheck.middleware";
import * as role from "../endpoints/role.endpoint";
import * as tag from "../endpoints/tag.endpoint";
import debugRouter from "../endpoints/debug.endpoint";

const adminRouter = Router();

// Apply admin check to all routes in this router
adminRouter.use(requireAdmin);

// ROLE management routes
adminRouter.post("/role/assign", role.assignRole);
adminRouter.post("/role/remove", role.removeRole);

// Tag management routes
adminRouter.post("/tag/update", tag.addOrUpdateTags);
adminRouter.post("/tag/rules", tag.updateRolesBasedOnTags);

// Debug routes
adminRouter.use("/debug", debugRouter);

export default adminRouter;
