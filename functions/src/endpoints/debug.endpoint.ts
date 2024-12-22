import { Router, Request, Response } from "express";
import { cleanupService } from "../services/cleanup.service";
import { ApiError } from "../utils/error";

const router = Router();

router.post("/cleanup", async (req: Request, res: Response) => {
  try {
    // Simulate error for testing if error query param is present
    if (req.query.error === "true") {
      throw new Error("Simulated error for testing");
    }

    const result = await cleanupService();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in cleanup endpoint:", error);
    res.status(error instanceof ApiError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
