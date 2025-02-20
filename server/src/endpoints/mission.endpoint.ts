import { Request, Response } from "express";
import { MissionService } from "../services";
import { Mission } from "../schemas";
import { sendError, sendSuccess, ApiError } from "../utils";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";

const missionService = new MissionService();

/**
 * Create a new mission
 */
export const handleCreateMission = async (req: Request, res: Response) => {
  try {
    console.log("[Create Mission] Starting with body:", req.body);
    const mission = await missionService.createMission(req.body as Mission);
    console.log("[Create Mission] Successfully created mission:", { id: mission.id });
    return sendSuccess(res, mission, SUCCESS_MESSAGES.MISSION_CREATED, 201);
  } catch (error) {
    console.error("[Create Mission] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_MISSION));
  }
};

/**
 * Get a mission by ID
 */
export const handleGetMission = async (req: Request, res: Response) => {
  try {
    console.log("[Get Mission] Starting with params:", req.params);
    const mission = await missionService.getMission(req.params.id);
    if (!mission) {
      console.log("[Get Mission] Mission not found:", req.params.id);
      return sendError(res, new ApiError(404, ERROR_MESSAGES.MISSION_NOT_FOUND));
    }
    console.log("[Get Mission] Successfully retrieved mission:", { id: mission.id });
    return sendSuccess(res, mission);
  } catch (error) {
    console.error("[Get Mission] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_MISSION));
  }
};

/**
 * Get available missions for a participant
 */
export const handleGetAvailableMissions = async (req: Request, res: Response) => {
  try {
    console.log("[Get Available Missions] Starting with:", {
      fingerprintId: req.auth?.fingerprint.id,
      query: req.query,
    });
    if (!req.auth?.fingerprint.id) {
      return sendError(res, new ApiError(401, ERROR_MESSAGES.FINGERPRINT_REQUIRED));
    }
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const missions = await missionService.getAvailableMissions(req.auth.fingerprint.id, limit);
    console.log("[Get Available Missions] Found missions:", { count: missions.length });
    return sendSuccess(res, missions);
  } catch (error) {
    console.error("[Get Available Missions] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      fingerprintId: req.auth?.fingerprint.id,
      query: req.query,
    });
    return sendError(
      res,
      ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_AVAILABLE_MISSIONS),
    );
  }
};

/**
 * Update mission status
 */
export const handleUpdateMissionStatus = async (req: Request, res: Response) => {
  try {
    console.log("[Update Mission Status] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const mission = await missionService.updateMissionStatus(req.params.id, req.body.status);
    console.log("[Update Mission Status] Successfully updated mission:", { id: mission.id });
    return sendSuccess(res, mission, SUCCESS_MESSAGES.MISSION_STATUS_UPDATED);
  } catch (error) {
    console.error("[Update Mission Status] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(
      res,
      ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_MISSION_STATUS),
    );
  }
};

/**
 * Update mission objectives
 */
export const handleUpdateMissionObjectives = async (req: Request, res: Response) => {
  try {
    console.log("[Update Mission Objectives] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const mission = await missionService.updateMissionObjectives(
      req.params.id,
      req.body.objectives,
    );
    console.log("[Update Mission Objectives] Successfully updated mission:", { id: mission.id });
    return sendSuccess(res, mission, SUCCESS_MESSAGES.MISSION_OBJECTIVES_UPDATED);
  } catch (error) {
    console.error("[Update Mission Objectives] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(
      res,
      ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_MISSION_OBJECTIVES),
    );
  }
};

/**
 * Get active missions for participant
 */
export const handleGetActiveMissions = async (req: Request, res: Response) => {
  try {
    console.log("[Get Active Missions] Starting with fingerprintId:", req.auth?.fingerprint.id);
    if (!req.auth?.fingerprint.id) {
      return sendError(res, new ApiError(401, ERROR_MESSAGES.FINGERPRINT_REQUIRED));
    }
    const missions = await missionService.getActiveMissions(req.auth.fingerprint.id);
    console.log("[Get Active Missions] Found missions:", { count: missions.length });
    return sendSuccess(res, missions);
  } catch (error) {
    console.error("[Get Active Missions] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      fingerprintId: req.auth?.fingerprint.id,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ACTIVE_MISSIONS));
  }
};

/**
 * Add failure record to mission
 */
export const handleAddFailureRecord = async (req: Request, res: Response) => {
  try {
    console.log("[Add Failure Record] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const mission = await missionService.addFailureRecord(req.params.id, req.body);
    console.log("[Add Failure Record] Successfully added record to mission:", { id: mission.id });
    return sendSuccess(res, mission, SUCCESS_MESSAGES.FAILURE_RECORD_ADDED);
  } catch (error) {
    console.error("[Add Failure Record] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_ADD_FAILURE_RECORD));
  }
};

/**
 * Delete mission
 */
export const handleDeleteMission = async (req: Request, res: Response) => {
  try {
    console.log("[Delete Mission] Starting with params:", req.params);
    await missionService.deleteMission(req.params.id);
    console.log("[Delete Mission] Successfully deleted mission:", req.params.id);
    return sendSuccess(res, null, SUCCESS_MESSAGES.MISSION_DELETED, 204);
  } catch (error) {
    console.error("[Delete Mission] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DELETE_MISSION));
  }
};
