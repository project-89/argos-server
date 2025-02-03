import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { calculateStabilityIndex } from "../services/realityStability.service";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";

const LOG_PREFIX = "[RealityStability]";

export const getRealityStabilityIndex = [
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Calculating reality stability index...`);
      const stabilityData = await calculateStabilityIndex();
      console.log(
        `${LOG_PREFIX} Successfully calculated stability index:`,
        stabilityData.stabilityIndex,
      );
      return sendSuccess(res, stabilityData);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error calculating reality stability index:`, error);
      if (error instanceof ApiError) {
        return sendError(res, error);
      }
      return sendError(res, new ApiError(500, ERROR_MESSAGES.FAILED_CALCULATE_STABILITY));
    }
  },
];
