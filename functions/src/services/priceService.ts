import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import { COLLECTIONS } from "../constants/collections";
import * as functions from "firebase-functions";
import { ApiError } from "../utils/error";
import { toUnixMillis } from "../utils/timestamp";
import { PriceHistory } from "../types/models";
import { ERROR_MESSAGES } from "../constants/api";
import { TokenPriceData, PriceResponse } from "../types/api.types";

const DEFAULT_TOKENS = ["project89"];
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
 * Get current prices for specified tokens
 */
export const getCurrentPrices = async (symbols: string[] = []): Promise<PriceResponse> => {
  try {
    const { apiUrl, apiKey } = getCoingeckoConfig();

    // Use default symbols if none provided
    const tokenSymbols = symbols.length > 0 ? symbols : DEFAULT_TOKENS;

    const db = getFirestore();
    const now = Timestamp.now();
    const prices: PriceResponse = {};
    const errors: string[] = [];

    for (const symbol of tokenSymbols) {
      try {
        // Check cache first
        const cacheRef = db.collection(COLLECTIONS.PRICE_CACHE).doc(symbol);
        const cacheDoc = await cacheRef.get();

        if (cacheDoc.exists) {
          const cacheData = cacheDoc.data();
          if (cacheData && now.toMillis() - toUnixMillis(cacheData.createdAt) < CACHE_DURATION) {
            prices[symbol] = {
              usd: cacheData.usd,
              usd_24h_change: cacheData.usd_24h_change,
            };
            continue;
          }
        }

        // Fetch from CoinGecko if not in cache or cache expired
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers["x-cg-pro-api-key"] = apiKey;
        }

        const response = await fetch(
          `${apiUrl}/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true`,
          { headers },
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new ApiError(404, ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
          }
          if (response.status === 429) {
            throw new ApiError(429, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
          }
          throw new ApiError(response.status, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
        }

        const responseData = await response.json();
        const data = responseData[symbol] as TokenPriceData;
        if (!data) {
          throw new ApiError(404, ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
        }

        prices[symbol] = {
          usd: data.usd,
          usd_24h_change: data.usd_24h_change,
        };

        // Update cache
        await cacheRef.set({
          usd: data.usd,
          usd_24h_change: data.usd_24h_change,
          createdAt: now,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          errors.push(error.message);
        } else {
          errors.push(ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
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
    throw new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
  }
};

/**
 * Get price history for a specific token
 */
export const getPriceHistory = async (symbol: string): Promise<PriceHistory[]> => {
  try {
    const db = getFirestore();
    const now = Timestamp.now();
    const cacheRef = db.collection(COLLECTIONS.PRICE_CACHE).doc(symbol);
    const cacheDoc = await cacheRef.get();

    // Check cache first
    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      if (
        cacheData &&
        cacheData.history &&
        Array.isArray(cacheData.history) &&
        cacheData.history.length > 0 &&
        now.toMillis() - toUnixMillis(cacheData.createdAt) < CACHE_DURATION
      ) {
        return cacheData.history;
      }
    }

    // If not in cache or cache expired, fetch from CoinGecko
    const { apiUrl, apiKey } = getCoingeckoConfig();
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["x-cg-pro-api-key"] = apiKey;
    }

    const response = await fetch(`${apiUrl}/coins/${symbol}/market_chart?vs_currency=usd&days=30`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError(404, ERROR_MESSAGES.TOKEN_NOT_FOUND);
      }
      if (response.status === 429) {
        throw new ApiError(429, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      }
      throw new ApiError(response.status, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.prices)) {
      throw new ApiError(500, ERROR_MESSAGES.INVALID_REQUEST);
    }

    const history = data.prices.map(([timestamp, price]: [number, number]) => ({
      price,
      createdAt: Timestamp.fromMillis(timestamp),
    }));

    // Update cache
    await cacheRef.set(
      {
        history,
        createdAt: now,
      },
      { merge: true },
    );

    return history;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Unexpected error fetching price history:", error);
    throw new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
  }
};
