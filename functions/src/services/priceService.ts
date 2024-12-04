import axios from "axios";
import { MOCK_PRICE_DATA } from "./mockData";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
}

export const getCurrentPrices = async (symbol: string): Promise<Record<string, PriceData>> => {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Return mock data for tests
    return {
      [symbol]: {
        usd: MOCK_PRICE_DATA[symbol]?.usd || 0,
        usd_24h_change: MOCK_PRICE_DATA[symbol]?.usd_24h_change || 0,
      },
    };
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: symbol,
        vs_currencies: "usd",
        include_24hr_change: true,
      },
    });

    const prices: Record<string, PriceData> = {};
    Object.entries(response.data).forEach(([id, data]: [string, any]) => {
      prices[id] = {
        usd: data.usd,
        usd_24h_change: data.usd_24h_change || 0,
      };
    });

    return prices;
  } catch (error: any) {
    console.error("Error fetching current prices:", error);
    throw new Error("Failed to fetch current prices");
  }
};

export const getPriceHistory = async (
  tokenId: string,
  timeframe: string = "24h",
  interval: string = "15m",
): Promise<PriceHistory[]> => {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Return mock data for tests
    const mockData = MOCK_PRICE_DATA[tokenId];
    if (!mockData) {
      throw new Error("Token not found");
    }

    const now = Date.now();
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        timestamp: now - i * 3600000, // 1 hour intervals
        price: mockData.usd + Math.random() * 10 - 5, // Add some random variation
      });
    }
    return data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/coins/${tokenId}/market_chart`, {
      params: {
        vs_currency: "usd",
        days: timeframe === "24h" ? 1 : timeframe === "7d" ? 7 : 30,
        interval,
      },
    });

    return response.data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch (error: any) {
    console.error("Error fetching price history:", error);
    throw new Error("Failed to fetch price history");
  }
};
