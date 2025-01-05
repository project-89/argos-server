import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { COLLECTIONS } from "../constants/collections";
import * as functions from "firebase-functions";
import { ApiError } from "../utils/error";

export interface PriceData {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

const DEFAULT_TOKENS = ["bitcoin", "ethereum"];
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get Coingecko configuration
const getCoingeckoConfig = () => {
  const config = functions.config();
  return {
    apiUrl: config.coingecko?.api_url || "https://api.coingecko.com/api/v3",
    apiKey: config.coingecko?.api_key,
  };
};

/**

/**
 * Get current prices for specified tokens
 */
export const getCurrentPrices = async (symbols: string[] = []): Promise<PriceData> => {
  try {
    const { apiUrl, apiKey } = getCoingeckoConfig();

    // Use default symbols if none provided
    const tokenSymbols = symbols.length > 0 ? symbols : DEFAULT_TOKENS;

    const db = getFirestore();
    const now = Date.now();
    const prices: PriceData = {};
    const errors: string[] = [];

    for (const symbol of tokenSymbols) {
      try {
        // Check cache first
        const cacheRef = db.collection(COLLECTIONS.PRICE_CACHE).doc(symbol);
        const cacheDoc = await cacheRef.get();

        if (cacheDoc.exists) {
          const cacheData = cacheDoc.data();
          if (cacheData && now - cacheData.timestamp < CACHE_DURATION) {
            prices[symbol] = {
              usd: cacheData.usd,
              usd_24h_change: cacheData.usd_24h_change,
            };
            continue;
          }
        }

        // Fetch from CoinGecko if not in cache or cache expired
        const response = await axios.get(
          `${apiUrl}/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true`,
          apiKey
            ? {
                headers: {
                  "x-cg-pro-api-key": apiKey,
                },
              }
            : undefined,
        );

        const data = response.data[symbol] as { usd: number; usd_24h_change: number };
        if (!data) {
          throw new ApiError(404, `No price data found for ${symbol}`);
        }

        prices[symbol] = {
          usd: data.usd,
          usd_24h_change: data.usd_24h_change,
        };

        // Update cache
        await cacheRef.set({
          usd: data.usd,
          usd_24h_change: data.usd_24h_change,
          timestamp: now,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          errors.push(error.message);
        } else {
          errors.push(`No price data found for ${symbol}`);
        }
      }
    }

    if (Object.keys(prices).length === 0) {
      throw new ApiError(404, errors.join(", "));
    }

    return prices;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error fetching prices:", error);
    throw new ApiError(500, "Failed to fetch current prices");
  }
};

/**
 * Get price history for a specific token
 */
export const getPriceHistory = async (tokenId: string): Promise<any[]> => {
  try {
    const { apiUrl, apiKey } = getCoingeckoConfig();

    try {
      const response = await axios.get(
        `${apiUrl}/coins/${tokenId}/market_chart?vs_currency=usd&days=30&interval=daily`,
        apiKey
          ? {
              headers: {
                "x-cg-pro-api-key": apiKey,
              },
            }
          : undefined,
      );

      if (!response.data || !response.data.prices || !Array.isArray(response.data.prices)) {
        throw new ApiError(404, "Token not found");
      }

      return response.data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new ApiError(404, "Token not found");
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error fetching price history:", error);
    throw new ApiError(500, "Failed to fetch token price history");
  }
};
