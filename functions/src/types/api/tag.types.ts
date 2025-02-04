import { ALLOWED_TAG_TYPES } from "../../constants";
import { Timestamp } from "firebase-admin/firestore";

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
  entries: (Omit<TagLeaderboardEntry, "lastTagAt" | "createdAt" | "updatedAt"> & {
    lastTagAt: number;
    createdAt: number;
    updatedAt: number;
  })[];
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
