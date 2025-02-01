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

// Simple API Response type (preserved from api.ts)
export interface SimpleApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Authentication Types
 */
export interface RegisterApiKeyRequest {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
  agentType?: string;
}

// Preserved both naming conventions for fingerprint registration
export interface RegisterFingerprintRequest {
  fingerprint: string;
  metadata?: Record<string, any>;
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
  status: "online" | "offline" | "away";
  lastUpdated: number; // Unix timestamp for tracking last activity/status update
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
 * Cleanup Service Types
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

export interface SiteEngagement {
  siteId: string;
  totalVisits: number;
  averageTimeSpent: number;
  returnRate: number;
  commonNextSites: string[];
}

export interface VisitAnalysis {
  patterns: VisitPattern[];
  engagement: SiteEngagement[];
}

/**
 * Tag Game Types
 */
export interface TagData {
  type: string;
  taggedBy: string;
  taggedAt: Timestamp;
}

export interface TagLimitData {
  firstTaggedAt: Timestamp;
  remainingDailyTags: number;
  lastTagResetAt: Timestamp;
}

export interface TagUserRequest {
  targetFingerprintId: string;
  tagType: string;
}

export interface TagUserResponse {
  success: boolean;
  message: string;
}

export interface TagHistoryResponse {
  tags: TagData[];
}

export interface GetUserTagsResponse {
  hasTags: boolean;
  activeTags: string[];
}

export interface GetRemainingTagsResponse {
  remainingTags: number;
}

/**
 * Tag Game Leaderboard Types
 */
export interface TagLeaderboardEntry {
  fingerprintId: string;
  totalTags: number;
  lastTagAt: Timestamp;
  streak: number;
  tagTypes: Record<string, number>;
}

export interface TagLeaderboardResponse {
  timeframe: "daily" | "weekly" | "monthly" | "allTime";
  entries: TagLeaderboardEntry[];
  userRank?: number;
}

export interface TagStatsDocument {
  id: string;
  fingerprintId: string;
  totalTagsMade: number;
  lastTagAt: Timestamp;
  dailyTags: number;
  weeklyTags: number;
  monthlyTags: number;
  streak: number;
  tagTypes: Record<string, number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tagHistory?: TagData[];
}

/**
 * Fingerprint Types
 */
export interface FingerprintData {
  tags?: Record<string, TagData>;
  tagLimits?: TagLimitData;
  // Add other fingerprint fields as needed
}
