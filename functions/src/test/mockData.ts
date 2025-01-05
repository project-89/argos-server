import { PriceData } from "../services/priceService";

export const MOCK_PRICE_DATA: PriceData = {
  Project89: {
    usd: 0.15,
    usd_24h_change: 2.5,
  },
};

export const DEFAULT_TOKENS = ["Project89"];

export const MOCK_PRICE_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
  price: 0.15 + Math.sin(i) * 0.01, // Fluctuate around $0.15
}));
