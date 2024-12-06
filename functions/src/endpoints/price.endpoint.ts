import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services/priceService";

export const getCurrent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbols } = req.query;
    const tokenSymbols = symbols ? (symbols as string).split(",") : [];

    const prices = await getCurrentPrices(tokenSymbols);

    return res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error: any) {
    console.error("Error in get current prices:", error);
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

    try {
      const history = await getPriceHistory(tokenId);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      if (error.message.includes("No price data found")) {
        return res.status(404).json({
          success: false,
          error: "Token not found",
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error in get token price history:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch token price history",
    });
  }
};
