import { PriceData } from "./priceService";

export const MOCK_PRICE_DATA: Record<string, PriceData> = {
  solana: {
    usd: 100.0,
    usd_24h_change: 5.0,
  },
  project89: {
    usd: 1.0,
    usd_24h_change: 2.0,
  },
};
