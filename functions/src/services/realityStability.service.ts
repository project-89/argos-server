import { getCurrentPrices } from "./price.service";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { RealityStabilityResponse } from "@/types/api.types";

/**
 * Calculate reality stability index based on Project89 token price data.
 * The stability index represents reality's resistance to positive price movements:
 * - Base stability is 100% (normal state)
 * - Positive price movements lower stability (reality fighting back)
 * - Minimum stability is 89% (reality can never be more unstable)
 * - Negative price movements return stability towards 100% (reality stabilizing)
 */
export const calculateStabilityIndex = async (): Promise<RealityStabilityResponse> => {
  try {
    // Get current price data for Project89
    const prices = await getCurrentPrices(["project89"]);
    if (!prices || !prices.project89) {
      throw new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    const priceChange = prices.project89.usd_24h_change;
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

    return {
      stabilityIndex,
      currentPrice: prices.project89.usd,
      priceChange: priceChange,
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
