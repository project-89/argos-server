import { Router } from "express";
import { publicEndpoint, protectedEndpoint } from "../middleware";
import {
  FingerprintRegisterSchema,
  FingerprintParamsSchema,
  FingerprintUpdateSchema,
} from "../schemas/fingerprint.schema";
import {
  handleRegisterFingerprint,
  handleGetFingerprint,
  handleUpdateFingerprint,
} from "../endpoints";

const router = Router();

// Public operations (initial fingerprint registration)
router.post(
  "/fingerprints",
  ...publicEndpoint(FingerprintRegisterSchema),
  handleRegisterFingerprint,
);

// Protected operations (requires account ownership)
router.get(
  "/fingerprints/:fingerprintId",
  ...protectedEndpoint(FingerprintParamsSchema),
  handleGetFingerprint,
);

router.patch(
  "/fingerprints/:fingerprintId",
  ...protectedEndpoint(FingerprintUpdateSchema),
  handleUpdateFingerprint,
);

export default router;
