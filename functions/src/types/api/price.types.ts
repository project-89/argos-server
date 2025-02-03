export interface PriceResponse {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
  };
}
