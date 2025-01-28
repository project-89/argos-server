import { Timestamp } from "firebase-admin/firestore";

// Database model (what we store in Firestore)
export interface ProfileStatsModel {
  id: string;
  missionsCompleted: number;
  successRate: number;
  totalRewards: number;
  reputation: number;
  joinedAt: Timestamp;
  lastActive: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// API response (what we send to clients)
export interface ProfileStats {
  id: string;
  missionsCompleted: number;
  successRate: number;
  totalRewards: number;
  reputation: number;
  joinedAt: number;
  lastActive: number;
  createdAt: number;
  updatedAt: number;
}

// Type alias for API response
export type StatsResponse = ProfileStats;

// Database model for history entries
export interface StatsHistoryModel {
  id: string;
  timestamp: Timestamp;
  stats: ProfileStatsModel;
}

// API response for history entries
export interface StatsHistory {
  id: string;
  timestamp: number;
  stats: ProfileStats;
}
