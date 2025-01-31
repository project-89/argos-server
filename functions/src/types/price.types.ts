/**
 * Price Data Types
 * Contains types for token prices and price history
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Price Data
 */
export interface TokenPriceData {
  usd: number;
  usd_24h_change: number;
  lastUpdated: number; // Unix timestamp for API response
}

export interface PriceResponse {
  [symbol: string]: TokenPriceData;
}

export interface PriceHistoryDataPoint {
  timestamp: number; // Unix timestamp for API response
  price: number;
}

export interface PriceHistoryParams {
  days?: number; // Currently fixed to 30 days
  vs_currency?: string; // Currently fixed to 'usd'
}

/**
 * Price Database Documents
 */
export interface TokenPriceDocument {
  symbol: string;
  usd: number;
  usd_24h_change: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PriceHistoryDocument {
  symbol: string;
  price: number;
  createdAt: Timestamp;
}

/**
 * Price Endpoints
 */
export const PRICE_ENDPOINTS = {
  GET_CURRENT_PRICES: "/price/current",
  GET_PRICE_HISTORY: "/price/history/:tokenId",
} as const;
