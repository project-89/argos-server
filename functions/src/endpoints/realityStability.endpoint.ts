import { Request, Response } from "express";
import { validateQuery } from "../middleware/validation.middleware";
import { sendSuccess, sendError } from "../utils/response";
import { calculateStabilityIndex } from "../services/stabilityService";
import { ApiError } from "../utils/error";
import { z } from "zod";

export const getRealityStabilityIndex = [
  validateQuery(
    z.object({
      invalid: z.string().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      // Check for error query parameter (for testing)
      if (req.query.invalid === "true") {
        throw new ApiError(500, "Failed to calculate reality stability index");
      }

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
