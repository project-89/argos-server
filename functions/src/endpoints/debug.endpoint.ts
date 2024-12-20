import { Router, Request, Response } from "express";
import { cleanupService } from "../services/cleanup.service";
import { validateApiKey } from "../endpoints/apiKey.endpoint";

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
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export const validate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { key } = req.body;
    const result = await validateApiKey(key);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in debug validate endpoint:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to validate key",
    });
  }
};

export default router;
