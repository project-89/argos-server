import fetch from "node-fetch";
import { ApiError, toMillis } from "../utils";
import { getDb } from "../utils/mongodb";
import type { PriceResponse, PriceHistoryResponse } from "../schemas";
import { ERROR_MESSAGES, CACHE_DURATION, COLLECTIONS } from "../constants";
import { stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Price Service]";
const DEFAULT_TOKENS = ["project89", "ethereum", "bitcoin"];

type PriceResult = {
  prices: Record<string, PriceResponse>;
  errors: { [symbol: string]: string };
};

/**
 * Get Coingecko API configuration
 */
const getCoingeckoConfig = () => {
  const isPro = process.env.COINGECKO_PRO === "true";
  return {
    apiUrl: isPro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    apiKey: process.env.COINGECKO_API_KEY || "",
  };
};

/**
 * Get current prices for provided tokens, or defaults if none provided
 */
export const getCurrentPrices = async (symbols: string[] = []): Promise<PriceResult> => {
  try {
    const { apiUrl, apiKey } = getCoingeckoConfig();

    // Use default symbols if none provided
    const tokenSymbols = symbols.length > 0 ? symbols : DEFAULT_TOKENS;

    const db = await getDb();
    const now = Date.now();
    const results: PriceResult = {
      prices: {},
      errors: {},
    };

    for (const symbol of tokenSymbols) {
      try {
        // Create a filter using string ID
        const symbolFilter = stringIdFilter("_id", symbol);

        // Check cache first
        const cacheDoc = await db.collection(COLLECTIONS.PRICE_CACHE).findOne(symbolFilter);

        if (cacheDoc) {
          if (now - cacheDoc.createdAt < CACHE_DURATION.PRICE) {
            results.prices[symbol] = {
              symbol,
              usd: cacheDoc.usd,
              usd_24h_change: cacheDoc.usd_24h_change,
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
        const data = responseData[symbol];
        if (!data) {
          throw new ApiError(404, ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
        }

        const priceData: PriceResponse = {
          symbol,
          usd: data.usd,
          usd_24h_change: data.usd_24h_change,
        };

        results.prices[symbol] = priceData;

        // Update cache with the filter
        await db.collection(COLLECTIONS.PRICE_CACHE).updateOne(
          symbolFilter,
          {
            $set: {
              ...priceData,
              createdAt: now,
            },
          },
          { upsert: true },
        );
      } catch (error) {
        console.error(`${LOG_PREFIX} Error getting price for ${symbol}:`, error);
        results.errors[symbol] = error instanceof Error ? error.message : String(error);
      }
    }

    if (Object.keys(results.prices).length === 0 && Object.keys(results.errors).length === 0) {
      // Only throw if we have no prices AND no specific errors
      throw new ApiError(404, ERROR_MESSAGES.ALL_PRICE_FETCHES_FAILED);
    }

    return results;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getCurrentPrices:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get price history for a specific token
 */
export const getPriceHistory = async (symbol: string): Promise<PriceHistoryResponse> => {
  try {
    const db = await getDb();
    const now = Date.now();

    // Create a filter using string ID
    const symbolFilter = stringIdFilter("_id", symbol);

    // Check cache first
    const cacheDoc = await db.collection(COLLECTIONS.PRICE_CACHE).findOne(symbolFilter);

    if (
      cacheDoc &&
      cacheDoc.history &&
      Array.isArray(cacheDoc.history) &&
      cacheDoc.history.length > 0 &&
      now - cacheDoc.createdAt < CACHE_DURATION.PRICE
    ) {
      return cacheDoc.history;
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

    const history: PriceHistoryResponse = data.prices.map(
      ([timestamp, price]: [number, number]) => ({
        price,
        createdAt: timestamp,
      }),
    );

    // Update cache using the filter
    await db.collection(COLLECTIONS.PRICE_CACHE).updateOne(
      symbolFilter,
      {
        $set: {
          history,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return history;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getPriceHistory:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
