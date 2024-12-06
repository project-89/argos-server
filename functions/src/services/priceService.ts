import axios from "axios";
import { getFirestore } from "firebase-admin/firestore";

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
}

export interface PriceData {
  [symbol: string]: CoinGeckoPrice;
}

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TOKENS = ["solana", "bitcoin"];

// Mock data for testing
const MOCK_PRICES: PriceData = {
  solana: {
    usd: 100.0,
    usd_24h_change: 5.0,
  },
  bitcoin: {
    usd: 50000.0,
    usd_24h_change: 2.5,
  },
  ethereum: {
    usd: 3000.0,
    usd_24h_change: 3.0,
  },
};

const MOCK_PRICE_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
  price: 100 + Math.sin(i) * 10,
}));

export const getCurrentPrices = async (symbols: string[] = []): Promise<PriceData> => {
  try {
    // Use default symbols if none provided
    const tokenSymbols = symbols.length > 0 ? symbols : DEFAULT_TOKENS;

    // Use mock data in test environment
    if (process.env.NODE_ENV === "test") {
      const prices: PriceData = {};
      tokenSymbols.forEach((symbol) => {
        if (MOCK_PRICES[symbol]) {
          prices[symbol] = MOCK_PRICES[symbol];
        } else {
          throw new Error(`No price data found for ${symbol}`);
        }
      });
      return prices;
    }

    const db = getFirestore();
    const now = Date.now();
    const prices: PriceData = {};

    for (const symbol of tokenSymbols) {
      // Check cache first
      const cacheRef = db.collection("priceCache").doc(symbol);
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
    }

    return prices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw error;
  }
};

export const getPriceHistory = async (tokenId: string): Promise<any[]> => {
  try {
    if (process.env.NODE_ENV === "test") {
      if (!MOCK_PRICES[tokenId]) {
        throw new Error(`No price data found for ${tokenId}`);
      }
      return MOCK_PRICE_HISTORY;
    }

    const response = await axios.get(
      `${COINGECKO_API}/coins/${tokenId}/market_chart?vs_currency=usd&days=30&interval=daily`,
    );

    return response.data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch (error) {
    console.error("Error fetching price history:", error);
    throw error;
  }
};
