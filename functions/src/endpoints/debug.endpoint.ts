import { Router, Request, Response } from "express";
import { cleanupService } from "../services/cleanup.service";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

router.post("/cleanup", async (req: Request, res: Response) => {
  try {
    const result = await cleanupService();
    return sendSuccess(res, result);
  } catch (error) {
    console.error("Error in cleanup endpoint:", error);
    if (error instanceof Error) {
      return sendError(res, error);
    }
    return sendError(res, "Internal server error");
  }
});

export default router;
