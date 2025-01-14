import { Router } from "express";
import { requireAdmin } from "../middleware/roleCheck.middleware";
import * as role from "../endpoints/role.endpoint";
import * as tag from "../endpoints/tag.endpoint";

const adminRouter = Router();

// ROLE management routes - apply admin check per route
adminRouter.post("/role/assign", requireAdmin, role.assignRole);
adminRouter.post("/role/remove", requireAdmin, role.removeRole);

// Tag management routes - apply admin check per route
adminRouter.post("/tag/update", requireAdmin, tag.addOrUpdateTags);
adminRouter.post("/tag/rules", requireAdmin, tag.updateRolesBasedOnTags);

export default adminRouter;
