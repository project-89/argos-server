import axios from "axios";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { MOCK_PRICE_DATA, DEFAULT_TOKENS, MOCK_PRICE_HISTORY } from "./mockData";

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
}

export interface PriceData {
  [symbol: string]: CoinGeckoPrice;
}

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCurrentPrices = async (
  symbols: string[] = [],
  isTestEnv = false,
): Promise<PriceData> => {
  try {
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
          `${COINGECKO_API}/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true`,
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

    if (Object.keys(prices).length === 0 && errors.length > 0) {
      throw new Error(errors[0]); // Throw the first error if no prices were found
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

    try {
      const response = await axios.get(
        `${COINGECKO_API}/coins/${tokenId}/market_chart?vs_currency=usd&days=30&interval=daily`,
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
