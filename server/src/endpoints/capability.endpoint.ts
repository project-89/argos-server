import { Request, Response } from "express";
import {
  skillMatchingService,
  createCapability,
  getCapabilities,
  updateCapability,
  deleteCapability,
} from "../services";
import { sendError, sendSuccess, ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

/**
 * Create a new capability for a profile
 */
export const handleCreateCapability = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("[Create Capability] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const capability = await createCapability({
      profileId: req.params.profileId,
      input: req.body,
    });
    console.log("[Create Capability] Successfully created capability:", { id: capability.id });
    return sendSuccess(res, capability, "Capability created successfully");
  } catch (error) {
    console.error("[Create Capability] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_CAPABILITY));
  }
};

/**
 * Get capabilities for a profile
 */
export const handleGetCapabilities = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("[Get Capabilities] Starting with params:", req.params);
    const capabilities = await getCapabilities({ profileId: req.params.profileId });
    console.log("[Get Capabilities] Successfully retrieved capabilities for profile:", {
      profileId: req.params.profileId,
      count: capabilities.length,
    });
    return sendSuccess(res, capabilities);
  } catch (error) {
    console.error("[Get Capabilities] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_CAPABILITIES));
  }
};

/**
 * Update a capability
 */
export const handleUpdateCapability = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("[Update Capability] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const capability = await updateCapability({
      profileId: req.params.profileId,
      capabilityId: req.params.capabilityId,
      input: req.body,
    });
    console.log("[Update Capability] Successfully updated capability:", { id: capability.id });
    return sendSuccess(res, capability, "Capability updated successfully");
  } catch (error) {
    console.error("[Update Capability] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_CAPABILITY));
  }
};

/**
 * Delete a capability
 */
export const handleDeleteCapability = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("[Delete Capability] Starting with params:", req.params);
    await deleteCapability({
      profileId: req.params.profileId,
      capabilityId: req.params.capabilityId,
    });
    console.log("[Delete Capability] Successfully deleted capability:", {
      profileId: req.params.profileId,
      capabilityId: req.params.capabilityId,
    });
    return sendSuccess(res, null, "Capability deleted successfully");
  } catch (error) {
    console.error("[Delete Capability] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DELETE_CAPABILITY));
  }
};

/**
 * Find similar skills based on name and description
 */
export const handleFindSimilarSkills = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("[Find Similar Skills] Starting with query:", req.query);

    const { name, description } = req.query;
    const searchText = `${name}${description ? ` - ${description}` : ""}`;

    const analysis = await skillMatchingService.analyzeSkill({ description: searchText });

    console.log("[Find Similar Skills] Analysis complete:", {
      matches: analysis.matches.length,
    });

    return sendSuccess(res, {
      matches: analysis.matches,
      suggestedType: analysis.suggestedType,
      suggestedCategory: analysis.suggestedCategory,
    });
  } catch (error) {
    console.error("[Find Similar Skills] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_FIND_SIMILAR_SKILLS));
  }
};
