import { Request, Response } from "express";
import { sendSuccess, sendError, ApiError } from "../utils";
import { calculateStabilityIndex } from "../services";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[RealityStability]";

export const handleGetRealityStabilityIndex = async (req: Request, res: Response) => {
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
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_CALCULATE_STABILITY));
  }
};
