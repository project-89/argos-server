import { Request, Response } from "express";
import { getCurrentPrices } from "../services/priceService";

export const getRealityStabilityIndex = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check for error query parameter
    if (req.query.invalid === "true") {
      throw new Error("Failed to calculate reality stability index");
    }

    // Get current price data
    const prices = await getCurrentPrices(["solana"]);
    if (!prices.solana) {
      throw new Error("Failed to get Solana price data");
    }

    // Calculate a simple stability index based on 24h price change
    const priceChange = Math.abs(prices.solana.usd_24h_change);
    const stabilityIndex = Math.max(0, 100 - priceChange);

    return res.status(200).json({
      success: true,
      data: {
        stabilityIndex,
        currentPrice: prices.solana.usd,
        priceChange: prices.solana.usd_24h_change,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error("Error calculating reality stability index:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate reality stability index",
    });
  }
};
