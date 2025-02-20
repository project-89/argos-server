import { Router } from "express";
import { publicEndpoint, adminEndpoint } from "../middleware/chains.middleware";
import { AssignRoleSchema, RemoveRoleSchema } from "../schemas";
import { handleGetAvailableRoles, handleAssignRole, handleRemoveRole } from "../endpoints";

const router = Router();

// Public endpoints
router.get("/roles/available", ...publicEndpoint(), handleGetAvailableRoles);

// Admin endpoints
router.post("/roles/assign", ...adminEndpoint(AssignRoleSchema), handleAssignRole);

router.post("/roles/remove", ...adminEndpoint(RemoveRoleSchema), handleRemoveRole);

export default router;
