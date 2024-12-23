import { getCurrentPrices } from "./priceService";
import { ApiError } from "../utils/error";

export interface StabilityData {
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number;
}

/**
 * Calculate reality stability index based on price data
 */
export const calculateStabilityIndex = async (): Promise<StabilityData> => {
  try {
    // Get current price data
    const prices = await getCurrentPrices(["solana"]);
    if (!prices.solana) {
      throw new ApiError(500, "Failed to get Solana price data");
    }

    // Calculate a simple stability index based on 24h price change
    const priceChange = Math.abs(prices.solana.usd_24h_change);
    const stabilityIndex = Math.max(0, 100 - priceChange);

    return {
      stabilityIndex,
      currentPrice: prices.solana.usd,
      priceChange: prices.solana.usd_24h_change,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error calculating reality stability index:", error);
    throw new ApiError(500, "Failed to calculate reality stability index");
  }
};
