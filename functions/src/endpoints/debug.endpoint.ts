import { Request, Response } from "express";
import { cleanupData } from "../services/cleanup.service";
import { validateQuery } from "../middleware/validation.middleware";
import { z } from "zod";

export const cleanup = [
  validateQuery(
    z.object({
      error: z.string().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const shouldError = req.query.error === "true";
      const result = await cleanupData(shouldError);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error in debug cleanup:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to perform cleanup",
      });
    }
  },
];
