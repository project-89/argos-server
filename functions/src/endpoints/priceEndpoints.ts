import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services/priceService";

export const getTokenPriceEndpoint = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { timeframe = "24h", interval = "15m" } = req.query;

    if (!tokenId) {
      return res.status(400).json({ error: "Missing required parameter: tokenId" });
    }

    const priceHistory = await getPriceHistory(tokenId, timeframe as string, interval as string);

    return res.status(200).json({
      success: true,
      data: priceHistory,
    });
  } catch (error: any) {
    console.error("Error in getTokenPriceEndpoint:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch token price",
    });
  }
};

export const getCurrentPricesEndpoint = async (req: Request, res: Response) => {
  try {
    const { symbols } = req.query;
    const prices = await getCurrentPrices(symbols as string);

    return res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error: any) {
    console.error("Error in getCurrentPricesEndpoint:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch current prices",
    });
  }
};
