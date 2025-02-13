import { Router } from "express";
import { protectedEndpoint } from "../middleware";
import {
  CapabilityCreateSchema,
  CapabilityGetSchema,
  CapabilityUpdateSchema,
  CapabilityDeleteSchema,
} from "../schemas";
import {
  handleCreateCapability,
  handleUpdateCapability,
  handleDeleteCapability,
  handleGetCapabilities,
} from "../endpoints";

const router = Router();

// All capability operations require authentication and ownership verification
router.post("/capabilities", ...protectedEndpoint(CapabilityCreateSchema), handleCreateCapability);
router.get("/capabilities", ...protectedEndpoint(CapabilityGetSchema), handleGetCapabilities);
router.patch(
  "/capabilities/:id",
  ...protectedEndpoint(CapabilityUpdateSchema),
  handleUpdateCapability,
);
router.delete(
  "/capabilities/:id",
  ...protectedEndpoint(CapabilityDeleteSchema),
  handleDeleteCapability,
);

export default router;
