import { getCurrentPrices } from ".";
import { ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[Reality Stability Service]";

/**
 * Calculate reality stability index based on Project89 token price data.
 * The stability index represents reality's resistance to positive price movements:
 * - Base stability is 100% (normal state)
 * - Positive price movements lower stability (reality fighting back)
 * - Minimum stability is 89% (reality can never be more unstable)
 * - Negative price movements return stability towards 100% (reality stabilizing)
 */
export const calculateStabilityIndex = async (): Promise<{
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number; // Unix timestamp
}> => {
  try {
    // Get current price data for Project89
    const result = await getCurrentPrices(["project89"]);

    // Check if we have any prices at all
    if (Object.keys(result.prices).length === 0) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    // Check for specific token errors
    if (result.errors["project89"]) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    // Check if we have the specific token price data
    if (!result.prices.project89) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    const priceData = result.prices.project89;
    const priceChange = priceData.usd_24h_change;
    let stabilityIndex = 100;

    // Only positive price changes affect stability
    if (priceChange > 0) {
      // Calculate instability based on magnitude of positive change
      // Larger positive changes create more instability
      const instability = Math.min(11, Math.log10(1 + priceChange) * 5);
      stabilityIndex = Math.max(89, 100 - instability);
    } else if (priceChange < 0) {
      // Negative changes help restore stability towards 100%
      stabilityIndex = 100; // Full stability restored
    }

    console.log(`${LOG_PREFIX} Calculated stability index:`, {
      stabilityIndex: stabilityIndex.toFixed(2),
      price: priceData.usd,
      change: priceChange.toFixed(2) + "%",
    });

    return {
      stabilityIndex,
      currentPrice: priceData.usd,
      priceChange: priceChange,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error calculating reality stability index:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
