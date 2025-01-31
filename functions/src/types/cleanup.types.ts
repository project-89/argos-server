/**
 * Cleanup Service Types
 * Contains types for data cleanup and maintenance operations
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Cleanup Results
 */
export interface CleanupResult {
  cleanupTime: number;
  itemsCleaned: {
    visits: number;
    presence: number;
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
  };
}

export interface VisitData {
  id: string;
  fingerprintId: string;
  siteId: string;
  timestamp: number;
}

export interface VisitPattern {
  currentSite: string;
  nextSite: string;
  transitionCount: number;
  averageTimeSpent: number;
}

/**
 * Cleanup Responses
 */
export interface CleanupResponse {
  cleanupTime: number; // Unix timestamp for API response
  itemsCleaned: {
    visits: number;
    presence: number;
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
  };
}

/**
 * Database Documents
 */
export interface CleanupDocument {
  id: string;
  cleanupTime: Timestamp;
  itemsCleaned: {
    visits: number;
    presence: number;
    priceCache: number;
    rateLimitStats: number;
    rateLimitRequests: number;
  };
  duration: number; // milliseconds
  status: "success" | "failed";
  error?: string;
}

export interface CleanupSchedule {
  id: string;
  lastRun: Timestamp;
  nextRun: Timestamp;
  frequency: number; // milliseconds
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Cleanup Endpoints
 */
export const CLEANUP_ENDPOINTS = {
  TRIGGER_CLEANUP: "/maintenance/cleanup",
  GET_CLEANUP_STATUS: "/maintenance/cleanup/status",
} as const;
