import { Router } from "express";
import { publicEndpoint, protectedEndpoint } from "../middleware/chains.middleware";
import {
  CreateAccountRequestSchema,
  GetAccountRequestSchema,
  UpdateAccountRequestSchema,
  LinkFingerprintRequestSchema,
  UnlinkFingerprintRequestSchema,
} from "../schemas";
import * as account from "../endpoints/account.endpoint";
import { validateAuthToken, verifyFingerprintExists } from "../middleware";

const router = Router();

// Public endpoints (no auth)
router.post("/accounts", ...publicEndpoint(CreateAccountRequestSchema), account.create);

// Protected endpoints (auth + ownership)
router.get("/accounts/:accountId", ...protectedEndpoint(GetAccountRequestSchema), account.get);

router.patch(
  "/accounts/:accountId",
  ...protectedEndpoint(UpdateAccountRequestSchema),
  account.update,
);

// Fingerprint management
router.post(
  "/accounts/:accountId/fingerprints/:fingerprintId",
  ...publicEndpoint(LinkFingerprintRequestSchema),
  validateAuthToken,
  verifyFingerprintExists,
  account.link,
);

router.delete(
  "/accounts/:accountId/fingerprints/:fingerprintId",
  ...protectedEndpoint(UnlinkFingerprintRequestSchema),
  account.unlink,
);

export default router;
