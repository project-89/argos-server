import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { calculateStabilityIndex } from "../services/stabilityService";
import { ApiError } from "../utils/error";

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
          : new ApiError(500, "Failed to calculate reality stability index"),
      );
    }
  },
];
