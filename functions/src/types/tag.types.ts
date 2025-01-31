/**
 * Tag Game Types
 * Contains types for the tag game system and leaderboard
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Tag Game Core Types
 */
export interface TagData {
  type: string;
  taggedBy: string;
  taggedAt: Timestamp;
  createdAt: Timestamp;
}

export interface TagLimitData {
  firstTaggedAt: Timestamp;
  remainingDailyTags: number;
  lastTagResetAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TagUserRequest {
  targetFingerprintId: string;
  tagType: string;
}

export interface TagUserResponse {
  success: boolean;
  message: string;
  timestamp: number; // Unix timestamp for API response
}

export interface TagHistoryResponse {
  tags: Array<{
    type: string;
    taggedBy: string;
    taggedAt: number; // Unix timestamp for API response
    createdAt: number; // Unix timestamp for API response
  }>;
}

export interface GetUserTagsResponse {
  hasTags: boolean;
  activeTags: string[];
  lastUpdated: number; // Unix timestamp for API response
}

export interface GetRemainingTagsResponse {
  remainingTags: number;
  lastReset: number; // Unix timestamp for API response
}

/**
 * Tag Game Leaderboard
 */
export interface TagLeaderboardEntry {
  fingerprintId: string;
  totalTags: number;
  lastTagAt: Timestamp;
  streak: number;
  tagTypes: Record<string, number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TagLeaderboardResponse {
  timeframe: "daily" | "weekly" | "monthly" | "allTime";
  entries: Array<{
    fingerprintId: string;
    totalTags: number;
    lastTagAt: number; // Unix timestamp for API response
    streak: number;
    tagTypes: Record<string, number>;
    createdAt: number; // Unix timestamp for API response
    updatedAt: number; // Unix timestamp for API response
  }>;
  userRank?: number;
  generatedAt: number; // Unix timestamp for API response
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
 * Tag Game Endpoints
 */
export const TAG_ENDPOINTS = {
  TAG_USER: "/tag/user",
  GET_USER_TAGS: "/tag/user/:fingerprintId",
  GET_TAG_HISTORY: "/tag/history/:fingerprintId",
  GET_REMAINING_TAGS: "/tag/remaining/:fingerprintId",
  GET_LEADERBOARD: "/tag/leaderboard",
} as const;
