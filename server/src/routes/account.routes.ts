import { Router } from "express";
import { fingerprintWriteEndpoint, protectedEndpoint } from "../middleware";
import {
  CreateAccountRequestSchema,
  GetAccountRequestSchema,
  UpdateAccountRequestSchema,
} from "../schemas";
import { handleCreateAccount, handleGetAccount, handleUpdateAccount } from "../endpoints";

const router = Router();

// Fingerprint verification required for account creation
router.post(
  "/accounts",
  ...fingerprintWriteEndpoint(CreateAccountRequestSchema),
  handleCreateAccount,
);

// Protected endpoints (auth + ownership)
router.get("/accounts/:accountId", ...protectedEndpoint(GetAccountRequestSchema), handleGetAccount);

router.patch(
  "/accounts/:accountId",
  ...protectedEndpoint(UpdateAccountRequestSchema),
  handleUpdateAccount,
);

export default router;
