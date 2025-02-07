import { Router } from "express";
import { protectedEndpoint, fingerprintWriteEndpoint } from "../middleware/chains.middleware";
import {
  CreateImpressionSchema,
  GetImpressionsSchema,
  DeleteImpressionsSchema,
} from "../schemas/impression.schema";
import {
  handleCreateImpression,
  handleGetImpressions,
  handleDeleteImpressions,
} from "../endpoints";

const router = Router();

// Fingerprint write operations (requires valid fingerprint)
router.post(
  "/impressions",
  ...fingerprintWriteEndpoint(CreateImpressionSchema),
  handleCreateImpression,
);

// Protected operations (requires account ownership)
router.get(
  "/impressions/:fingerprintId",
  ...protectedEndpoint(GetImpressionsSchema),
  handleGetImpressions,
);

router.delete(
  "/impressions/:fingerprintId",
  ...protectedEndpoint(DeleteImpressionsSchema),
  handleDeleteImpressions,
);

export default router;
