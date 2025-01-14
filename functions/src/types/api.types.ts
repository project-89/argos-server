/**
 * Argos API Type Definitions
 * This file contains all type definitions and documentation for the Argos API endpoints.
 */

import { Timestamp } from "firebase-admin/firestore";
import type { Impression as ImpressionModel } from "./models";

/**
 * Standard API Response Format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  requestId: string;
  timestamp: number; // Unix timestamp
  details?: any[];
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  requestId: string;
  timestamp: number;
  details?: Array<{
    code: string;
    path: (string | number)[];
    message: string;
    expected?: string | undefined;
    received?: string | undefined;
  }>;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Authentication Types
 */
export interface RegisterApiKeyRequest {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
  agentType?: string;
}

export interface FingerprintRegistrationRequest {
  fingerprint: string;
  metadata?: Record<string, any>;
}

export interface FingerprintRegistrationResponse {
  id: string;
  timestamp: number; // Unix timestamp
}

export interface ApiKeyRegistrationRequest {
  fingerprintId: string;
}

export interface ApiKeyRegistrationResponse {
  key: string;
  fingerprintId: string;
  timestamp: number; // Unix timestamp
}

export interface ApiKeyValidationRequest {
  key: string;
}

export interface ApiKeyValidationResponse {
  isValid: boolean;
  needsRefresh: boolean;
}

/**
 * Visit Tracking Types
 */
export interface LogVisitRequest {
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp?: number; // Unix timestamp
}

export interface UpdatePresenceRequest {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites?: string[];
}

export interface RemoveSiteRequest {
  fingerprintId: string;
  siteId: string;
}

/**
 * Role Management Types
 */
export interface AssignRoleRequest {
  fingerprintId: string;
  role: string;
}

export interface UpdateTagsRequest {
  fingerprintId: string;
  tags: Record<string, any>;
}

export interface UpdateRolesByTagsRequest {
  fingerprintId: string;
  tagRules: Record<string, string>;
}

/**
 * Impression Types
 */
export interface CreateImpressionRequest
  extends Omit<ImpressionModel, "timestamp" | "createdAt" | "id"> {}

export interface GetImpressionsQuery {
  type?: string;
  startTime?: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  limit?: number;
  sessionId?: string;
}

export interface DeleteImpressionsQuery extends GetImpressionsQuery {}

/**
 * Visit Tracking Types
 */
export interface Visit {
  fingerprintId: string;
  url: string;
  title: string | undefined;
  siteId: string;
  clientIp?: string;
  timestamp: Timestamp;
}

export interface Site {
  domain: string;
  fingerprintId: string;
  lastVisited: Timestamp;
  title?: string;
  visits: number;
  settings: {
    notifications: boolean;
    privacy: "public" | "private";
  };
  createdAt: Timestamp;
}

export interface SiteModel extends Omit<Site, "lastVisited" | "createdAt"> {
  id: string;
  lastVisited: number; // Unix timestamp for API responses
  createdAt: number; // Unix timestamp for API responses
}

export interface VisitHistoryResponse {
  id: string;
  fingerprintId: string;
  timestamp: number; // Unix timestamp
  url: string;
  title?: string;
  siteId: string;
  site?: SiteModel;
}

export interface VisitPresence {
  fingerprintId: string;
  status: "online" | "offline";
  lastUpdated: number; // Unix timestamp
}

/**
 * Price Data Types
 */
export interface TokenPriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceResponse {
  [symbol: string]: TokenPriceData;
}

export interface PriceHistoryDataPoint {
  timestamp: number; // Unix timestamp
  price: number;
}

export interface PriceHistoryParams {
  days?: number; // Currently fixed to 30 days
  vs_currency?: string; // Currently fixed to 'usd'
}

/**
 * Reality Stability Types
 */
export interface RealityStabilityResponse {
  stabilityIndex: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number; // Unix timestamp
}

/**
 * API Endpoints Configuration
 */
export const API_ENDPOINTS = {
  // Authentication
  REGISTER_FINGERPRINT: "/fingerprint/register",
  REGISTER_API_KEY: "/api-key/register",
  VALIDATE_API_KEY: "/api-key/validate",
  REVOKE_API_KEY: "/api-key/revoke",

  // Impressions
  CREATE_IMPRESSION: "/impressions",
  GET_IMPRESSIONS: "/impressions/:fingerprintId",
  DELETE_IMPRESSIONS: "/impressions/:fingerprintId",

  // Visit Tracking
  LOG_VISIT: "/visit/log",
  UPDATE_PRESENCE: "/visit/presence",
  GET_VISIT_HISTORY: "/visit/history/:fingerprintId",
  REMOVE_SITE: "/visit/site/remove",

  // Fingerprint Management
  GET_FINGERPRINT: "/fingerprint/:id",
  UPDATE_FINGERPRINT: "/fingerprint/update",

  // Price Data
  GET_CURRENT_PRICES: "/price/current",
  GET_PRICE_HISTORY: "/price/history/:tokenId",
  GET_REALITY_STABILITY: "/reality-stability",
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMITS = {
  PUBLIC_ENDPOINTS: {
    REQUESTS_PER_HOUR: 100,
    SCOPE: "IP",
  },
  PROTECTED_ENDPOINTS: {
    REQUESTS_PER_HOUR: 1000,
    SCOPE: "API_KEY",
  },
  HEALTH_ENDPOINTS: {
    REQUESTS_PER_MINUTE: 60,
    SCOPE: "IP",
  },
} as const;

/**
 * Error Codes and Messages
 */
export const API_ERRORS = {
  BAD_REQUEST: {
    code: 400,
    message: "Invalid parameters provided",
  },
  UNAUTHORIZED: {
    code: 401,
    message: "Missing or invalid API key",
  },
  FORBIDDEN: {
    code: 403,
    message: "API key does not match fingerprint",
  },
  NOT_FOUND: {
    code: 404,
    message: "Resource not found",
  },
  RATE_LIMIT_EXCEEDED: {
    code: 429,
    message: "Rate limit exceeded",
  },
  INTERNAL_ERROR: {
    code: 500,
    message: "Internal server error",
  },
} as const;
