/**
 * Tag Game Types
 * Contains types for the tag game system and leaderboard
 */

import { ALLOWED_TAG_TYPES } from "@/constants/tag.constants";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Tag Game Core Types
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  timeFrame: "daily" | "weekly" | "monthly" | "allTime";
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

export interface TagStats {
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

export type TagType = (typeof ALLOWED_TAG_TYPES)[keyof typeof ALLOWED_TAG_TYPES];
