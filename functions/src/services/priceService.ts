import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { COLLECTIONS } from "../constants";
import * as functions from "firebase-functions";

export interface PriceData {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

// Mock data for testing
const MOCK_PRICE_DATA: PriceData = {
  bitcoin: { usd: 50000, usd_24h_change: 2.5 },
  ethereum: { usd: 3000, usd_24h_change: 1.8 },
  Project89: { usd: 0.15, usd_24h_change: 2.5 },
};

// Mock price history for testing
const MOCK_PRICE_HISTORY = [
  { timestamp: Date.now() - 86400000 * 30, price: 0.15 },
  { timestamp: Date.now() - 86400000 * 29, price: 0.16 },
  { timestamp: Date.now() - 86400000 * 28, price: 0.14 },
  { timestamp: Date.now() - 86400000 * 27, price: 0.15 },
  { timestamp: Date.now() - 86400000 * 26, price: 0.16 },
  { timestamp: Date.now(), price: 0.15 },
];

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

export const getCurrentPrices = async (
  symbols: string[] = [],
  isTestEnv = false,
): Promise<PriceData> => {
  try {
    const { apiUrl, apiKey } = getCoingeckoConfig();

    // Use default symbols if none provided
    const tokenSymbols = symbols.length > 0 ? symbols : DEFAULT_TOKENS;

    // Use mock data in test environment
    if (isTestEnv) {
      const prices: PriceData = {};
      for (const symbol of tokenSymbols) {
        if (MOCK_PRICE_DATA[symbol]) {
          prices[symbol] = MOCK_PRICE_DATA[symbol];
        } else {
          throw new Error(`No price data found for ${symbol}`);
        }
      }
      return prices;
    }

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
          throw new Error(`No price data found for ${symbol}`);
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
      } catch (error: any) {
        errors.push(`No price data found for ${symbol}`);
      }
    }

    if (Object.keys(prices).length === 0) {
      throw new Error(errors.join(", "));
    }

    return prices;
  } catch (error: any) {
    console.error("Error fetching prices:", error);
    throw error;
  }
};

export const getPriceHistory = async (tokenId: string, isTestEnv = false): Promise<any[]> => {
  try {
    // Use mock data in test environment
    if (isTestEnv) {
      if (!MOCK_PRICE_DATA[tokenId]) {
        throw new Error(`No price data found for ${tokenId}`);
      }
      return MOCK_PRICE_HISTORY;
    }

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
        throw new Error(`No price data found for ${tokenId}`);
      }

      return response.data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`No price data found for ${tokenId}`);
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error fetching price history:", error);
    throw error;
  }
};
