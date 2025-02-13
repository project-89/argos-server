import { Request, Response } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants";
import { sendSuccess, sendError } from "../utils/response";
import {
  startOnboarding,
  verifyMission,
  getOnboardingProgress,
  completeOnboarding,
} from "../services";

export const handleStartOnboarding = async (req: Request, res: Response) => {
  try {
    const progress = await startOnboarding(req.body);
    return sendSuccess(res, progress, "Onboarding started successfully", 201);
  } catch (error) {
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT));
  }
};

export const handleVerifyMission = async (req: Request, res: Response) => {
  try {
    const result = await verifyMission(req.body);
    return sendSuccess(res, result, "Mission verification processed");
  } catch (error) {
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT));
  }
};

export const handleGetProgress = async (req: Request, res: Response) => {
  try {
    const { onboardingId } = req.params;
    const progress = await getOnboardingProgress(onboardingId);
    return sendSuccess(res, progress, "Onboarding progress retrieved");
  } catch (error) {
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

export const handleCompleteOnboarding = async (req: Request, res: Response) => {
  try {
    const result = await completeOnboarding(req.body);
    return sendSuccess(res, result, "Onboarding completed successfully");
  } catch (error) {
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT));
  }
};
