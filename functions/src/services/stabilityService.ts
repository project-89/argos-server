import { getCurrentPrices } from "./priceService";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

export interface StabilityData {
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number;
}

/**
 * Calculate reality stability index based on Project89 token price data
 */
export const calculateStabilityIndex = async (): Promise<StabilityData> => {
  try {
    // Get current price data for Project89
    const prices = await getCurrentPrices(["project89"]);
    if (!prices.project89) {
      throw new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    // Calculate a simple stability index based on 24h price change
    const priceChange = Math.abs(prices.project89.usd_24h_change);
    const stabilityIndex = Math.max(0, 100 - priceChange);

    return {
      stabilityIndex,
      currentPrice: prices.project89.usd,
      priceChange: prices.project89.usd_24h_change,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error calculating reality stability index:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
