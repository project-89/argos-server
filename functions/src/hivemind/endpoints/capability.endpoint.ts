import { Request, Response } from "express";
import { capabilityService } from "../services/capability.service";
import { skillMatchingService } from "../services/skillMatching.service";
import { validateRequest } from "../../middleware/validation.middleware";
import { sendError, sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/error";
import {
  CapabilityCreateSchema,
  CapabilityDeleteSchema,
  CapabilityGetSchema,
  CapabilityUpdateSchema,
  SkillSearchSchema,
} from "../schemas";

/**
 * Create a new capability for a profile
 */
export const createCapability = [
  validateRequest(CapabilityCreateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Create Capability] Starting with:", {
        params: req.params,
        body: req.body,
      });
      const capability = await capabilityService.createCapability(req.params.profileId, req.body);
      console.log("[Create Capability] Successfully created capability:", { id: capability.id });
      return sendSuccess(res, capability, "Capability created successfully");
    } catch (error) {
      console.error("[Create Capability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        params: req.params,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to create capability", 500);
    }
  },
];

/**
 * Get capabilities for a profile
 */
export const getCapabilities = [
  validateRequest(CapabilityGetSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Get Capabilities] Starting with params:", req.params);
      const capabilities = await capabilityService.getCapabilities(req.params.profileId);
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
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get capabilities", 500);
    }
  },
];

/**
 * Update a capability
 */
export const updateCapability = [
  validateRequest(CapabilityUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Update Capability] Starting with:", {
        params: req.params,
        body: req.body,
      });
      const capability = await capabilityService.updateCapability(
        req.params.profileId,
        req.params.capabilityId,
        req.body,
      );
      console.log("[Update Capability] Successfully updated capability:", { id: capability.id });
      return sendSuccess(res, capability, "Capability updated successfully");
    } catch (error) {
      console.error("[Update Capability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        params: req.params,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to update capability", 500);
    }
  },
];

/**
 * Delete a capability
 */
export const deleteCapability = [
  validateRequest(CapabilityDeleteSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Delete Capability] Starting with params:", req.params);
      await capabilityService.deleteCapability(req.params.profileId, req.params.capabilityId);
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
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to delete capability", 500);
    }
  },
];

/**
 * Find similar skills based on name and description
 */
export const findSimilarSkills = [
  validateRequest(SkillSearchSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Find Similar Skills] Starting with query:", req.query);

      const { name, description } = req.query;
      const searchText = `${name}${description ? ` - ${description}` : ""}`;

      const analysis = await skillMatchingService.analyzeSkill({
        description: searchText,
      });

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
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to find similar skills", 500);
    }
  },
];
