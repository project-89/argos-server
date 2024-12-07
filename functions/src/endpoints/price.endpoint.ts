import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services/priceService";

// Helper to check if we're in test environment
const isTestEnv = (req: Request) => {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.FUNCTIONS_EMULATOR === "true" ||
    req.headers["x-test-env"] === "true"
  );
};

export const getCurrent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbols } = req.query;
    let tokenSymbols: string[] = [];

    if (symbols) {
      if (typeof symbols !== "string") {
        return res.status(400).json({
          success: false,
          error: "Invalid symbols parameter: must be a comma-separated string",
        });
      }
      tokenSymbols = symbols
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const prices = await getCurrentPrices(tokenSymbols, isTestEnv(req));
    return res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error: any) {
    console.error("Error in get current prices:", error);
    if (error.message.includes("No price data found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch current prices",
    });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { tokenId } = req.params;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: tokenId",
      });
    }

    const history = await getPriceHistory(tokenId, isTestEnv(req));
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Error in get token price history:", error);
    if (error.message.includes("No price data found")) {
      return res.status(404).json({
        success: false,
        error: "Token not found",
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch token price history",
    });
  }
};
