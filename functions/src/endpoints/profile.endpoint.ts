import { Request, Response } from "express";
import { profileService } from "../services/profile.service";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import { sendError, sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";

export const createProfile = [
  validateRequest(schemas.profileCreate),
  async (req: Request, res: Response) => {
    try {
      const profile = await profileService.createProfile(req.body);
      return sendSuccess(res, profile);
    } catch (error) {
      return sendError(res, error instanceof Error ? error : new ApiError(500, "Unknown error"));
    }
  },
];

export const getProfile = [
  validateRequest(schemas.profileGet),
  async (req: Request, res: Response) => {
    try {
      const profile = await profileService.getProfile(req.params.id);
      return sendSuccess(res, profile);
    } catch (error) {
      return sendError(res, error instanceof Error ? error : new ApiError(500, "Unknown error"));
    }
  },
];

export const getProfileByWallet = [
  validateRequest(schemas.profileGetByWallet),
  async (req: Request, res: Response) => {
    try {
      const profile = await profileService.getProfileByWallet(req.params.walletAddress);
      return sendSuccess(res, profile);
    } catch (error) {
      return sendError(res, error instanceof Error ? error : new ApiError(500, "Unknown error"));
    }
  },
];

export const updateProfile = [
  validateRequest(schemas.profileUpdate),
  async (req: Request, res: Response) => {
    try {
      const profile = await profileService.updateProfile(req.params.id, req.body);
      return sendSuccess(res, profile);
    } catch (error) {
      return sendError(res, error instanceof Error ? error : new ApiError(500, "Unknown error"));
    }
  },
];
