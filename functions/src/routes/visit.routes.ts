import { Router } from "express";
import { protectedEndpoint, fingerprintWriteEndpoint } from "../middleware/chains.middleware";
import { VisitLogSchema, VisitRemoveSiteSchema, VisitHistorySchema } from "../schemas";
import { handleLogVisit, handleRemoveSite, handleGetHistory } from "../endpoints";

const router = Router();

// Visit logging (requires fingerprint verification)
router.post("/visits", ...fingerprintWriteEndpoint(VisitLogSchema), handleLogVisit);

// Protected operations (requires account ownership)
router.get(
  "/visits/history/:fingerprintId",
  ...protectedEndpoint(VisitHistorySchema),
  handleGetHistory,
);

router.delete("/visits/site", ...protectedEndpoint(VisitRemoveSiteSchema), handleRemoveSite);

export default router;
