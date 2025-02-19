import { Request, Response } from "express";
import {
  createProfile,
  updateProfile,
  getProfile,
  searchProfiles,
  getProfileByWallet,
} from "../services";
import { sendError, sendSuccess, ApiError } from "../utils";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";

/**
 * Create a new profile
 */
export const handleCreateProfile = async (req: Request, res: Response) => {
  try {
    console.log("[Create Profile] Starting with body:", req.body);
    const profile = await createProfile(req.body);
    console.log("[Create Profile] Successfully created profile:", { id: profile.id });
    return sendSuccess(res, profile, SUCCESS_MESSAGES.PROFILE_CREATED);
  } catch (error) {
    console.error("[Create Profile] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_PROFILE));
  }
};

/**
 * Get a profile by ID
 */
export const handleGetProfile = async (req: Request, res: Response) => {
  try {
    console.log("[Get Profile] Starting with params:", req.params);
    const profile = await getProfile(req.params.id);
    console.log("[Get Profile] Successfully retrieved profile:", { id: profile.id });
    return sendSuccess(res, profile);
  } catch (error) {
    console.error("[Get Profile] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_PROFILE));
  }
};

/**
 * Get a profile by wallet address
 */
export const handleGetProfileByWallet = async (req: Request, res: Response) => {
  try {
    console.log("[Get Profile By Wallet] Starting with params:", req.params);
    const profile = await getProfileByWallet(req.params.walletAddress);
    console.log("[Get Profile By Wallet] Successfully retrieved profile:", { id: profile.id });
    return sendSuccess(res, profile);
  } catch (error) {
    console.error("[Get Profile By Wallet] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });

    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_PROFILE));
  }
};

/**
 * Update a profile
 */
export const handleUpdateProfile = async (req: Request, res: Response) => {
  try {
    console.log("[Update Profile] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const profile = await updateProfile(req.params.id, req.body);
    console.log("[Update Profile] Successfully updated profile:", { id: profile.id });
    return sendSuccess(res, profile, "Profile updated successfully");
  } catch (error) {
    console.error("[Update Profile] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_PROFILE));
  }
};

/**
 * Search profiles
 */
export const handleSearchProfiles = async (req: Request, res: Response) => {
  try {
    console.log("[Search Profiles] Starting with query:", req.query);
    const results = await searchProfiles(req.query);
    console.log("[Search Profiles] Found profiles:", { total: results.total });
    return sendSuccess(res, results);
  } catch (error) {
    console.error("[Search Profiles] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_SEARCH_PROFILES));
  }
};
