import { Request, Response } from "express";
import { profileService } from "../services/profile.hivemind.service";
import { validateRequest } from "../middleware/validation.middleware";
import { sendError, sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import {
  ProfileCreateSchema,
  ProfileGetByWalletSchema,
  ProfileGetSchema,
  ProfileSearchSchema,
  ProfileUpdateSchema,
} from "../schemas";

/**
 * Create a new profile
 */
export const createProfile = [
  validateRequest(ProfileCreateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Create Profile] Starting with body:", req.body);
      const profile = await profileService.createProfile(req.body);
      console.log("[Create Profile] Successfully created profile:", { id: profile.id });
      return sendSuccess(res, profile, "Profile created successfully");
    } catch (error) {
      console.error("[Create Profile] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to create profile", 500);
    }
  },
];

/**
 * Get a profile by ID
 */
export const getProfile = [
  validateRequest(ProfileGetSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Get Profile] Starting with params:", req.params);
      const profile = await profileService.getProfile(req.params.id);
      console.log("[Get Profile] Successfully retrieved profile:", { id: profile.id });
      return sendSuccess(res, profile);
    } catch (error) {
      console.error("[Get Profile] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        params: req.params,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get profile", 500);
    }
  },
];

/**
 * Get a profile by wallet address
 */
export const getProfileByWallet = [
  validateRequest(ProfileGetByWalletSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Get Profile By Wallet] Starting with params:", req.params);
      const profile = await profileService.getProfileByWallet(req.params.walletAddress);
      console.log("[Get Profile By Wallet] Successfully retrieved profile:", { id: profile.id });
      return sendSuccess(res, profile);
    } catch (error) {
      console.error("[Get Profile By Wallet] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        params: req.params,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get profile by wallet", 500);
    }
  },
];

/**
 * Update a profile
 */
export const updateProfile = [
  validateRequest(ProfileUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Update Profile] Starting with:", {
        params: req.params,
        body: req.body,
      });
      const profile = await profileService.updateProfile(req.params.id, req.body);
      console.log("[Update Profile] Successfully updated profile:", { id: profile.id });
      return sendSuccess(res, profile, "Profile updated successfully");
    } catch (error) {
      console.error("[Update Profile] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        params: req.params,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to update profile", 500);
    }
  },
];

/**
 * Search for profiles based on various criteria
 */
export const searchProfiles = [
  validateRequest(ProfileSearchSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Search Profiles] Starting with query:", req.query);
      const { profiles, total } = await profileService.searchProfiles(req.query);
      console.log("[Search Profiles] Found profiles:", { count: profiles.length, total });
      return sendSuccess(res, { profiles, total });
    } catch (error) {
      console.error("[Search Profiles] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to search profiles", 500);
    }
  },
];
