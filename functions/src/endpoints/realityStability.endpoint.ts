import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { calculateStabilityIndex } from "../services/stabilityService";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

export const getRealityStabilityIndex = [
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const stabilityData = await calculateStabilityIndex();
      return sendSuccess(res, stabilityData, "Reality stability index calculated");
    } catch (error) {
      console.error("Error calculating reality stability index:", error);
      return sendError(
        res,
        error instanceof Error
          ? error
          : new ApiError(500, ERROR_MESSAGES.FAILED_CALCULATE_STABILITY),
      );
    }
  },
];
