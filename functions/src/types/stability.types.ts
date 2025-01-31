/**
 * Reality Stability Types
 * Contains types for tracking and calculating reality stability metrics
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Stability Metrics
 */
export interface RealityStabilityResponse {
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number; // Unix timestamp
}

export interface StabilityDocument {
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastCalculation: Timestamp;
}

/**
 * Stability Endpoints
 */
export const STABILITY_ENDPOINTS = {
  GET_REALITY_STABILITY: "/reality-stability",
} as const;
