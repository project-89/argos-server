import { Request, Response } from "express";
import { ApiError, sendError } from "../utils";
import { CreateInviteRequest, ValidateInviteRequest } from "../schemas";
import { createInvite, validateInvite, revokeInvite } from "../services/agentInvite.service";
import { ERROR_MESSAGES } from "../constants";

export async function handleCreateInvite(
  req: Request<{}, {}, CreateInviteRequest["body"]>,
  res: Response,
) {
  try {
    // Admin ID is set by auth middleware
    const adminId = req.auth?.account?.id;
    if (!adminId) {
      throw new ApiError(401, "Admin authentication required");
    }

    const invite = await createInvite(req.body, adminId);
    res.status(201).json({
      ...invite,
      registrationUrl: `${process.env.API_URL}/agents/register?invite=${invite.id}`,
    });
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_INVITE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleValidateInvite(
  req: Request<ValidateInviteRequest["params"]>,
  res: Response,
) {
  try {
    const invite = await validateInvite(req.params.inviteCode);
    res.status(200).json(invite);
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VALIDATE_INVITE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleRevokeInvite(req: Request<{ inviteCode: string }>, res: Response) {
  try {
    await revokeInvite(req.params.inviteCode);
    res.status(200).json({ message: "Invite successfully revoked" });
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REVOKE_INVITE);
    sendError(res, apiError, apiError.statusCode);
  }
}
