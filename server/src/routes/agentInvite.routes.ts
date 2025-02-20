import { Router } from "express";
import { handleCreateInvite, handleValidateInvite, handleRevokeInvite } from "../endpoints";
import {
  CreateInviteRequestSchema,
  DeleteInviteRequestSchema,
  ValidateInviteRequestSchema,
} from "../schemas";
import { adminEndpoint, publicEndpoint } from "../middleware";

const router = Router();

// Admin-only routes for invite management
router.post("/agents/invites", adminEndpoint(CreateInviteRequestSchema), handleCreateInvite);
router.delete(
  "/agents/invites/:inviteCode",
  adminEndpoint(DeleteInviteRequestSchema),
  handleRevokeInvite,
);

// Public route for validating invites
router.get(
  "/agents/invites/:inviteCode",
  publicEndpoint(ValidateInviteRequestSchema),
  handleValidateInvite,
);

export default router;
