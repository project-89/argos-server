import { Router } from "express";
import { protectedEndpoint, fingerprintWriteEndpoint } from "../middleware/chains.middleware";
import {
  PresenceUpdateSchema,
  PresenceGetSchema,
  PresenceActivitySchema,
} from "../schemas/presence.schema";
import { handleUpdatePresence, handleUpdateActivityStatus, handleGetPresence } from "../endpoints";

const router = Router();

// Presence updates (requires fingerprint verification)
router.post(
  "/presence/:fingerprintId/status",
  ...fingerprintWriteEndpoint(PresenceUpdateSchema),
  handleUpdatePresence,
);

router.post(
  "/presence/:fingerprintId/activity",
  ...fingerprintWriteEndpoint(PresenceActivitySchema),
  handleUpdateActivityStatus,
);

// Protected operations (requires account ownership)
router.get("/presence/:fingerprintId", ...protectedEndpoint(PresenceGetSchema), handleGetPresence);

export default router;
