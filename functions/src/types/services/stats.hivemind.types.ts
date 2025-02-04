import { Timestamp } from "firebase-admin/firestore";

// Database model (what we store in Firestore)
export interface StatsModel {
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
export interface Stats {
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
export type StatsResponse = Stats;

// Database model for history entries
export interface StatsHistoryModel {
  id: string;
  timestamp: Timestamp;
  stats: StatsModel;
}

// API response for history entries
export interface StatsHistory {
  id: string;
  timestamp: number;
  stats: Stats;
}

export interface UpdateStatsInput {
  missionsCompleted?: number;
  successRate?: number;
  totalRewards?: number;
  reputation?: number;
}

// Type for API response that converts Timestamps to Unix time
export type StatsHistoryResponse = Omit<StatsHistory, "timestamp"> & {
  timestamp: number;
};

export interface ProfileStats {
  profileId: string;
  totalCapabilities: number;
  verifiedCapabilities: number;
  verificationRate: number;
  skillDistribution: Record<string, number>;
  completionScore: number;
  updatedAt: number;
  customMetrics?: Record<string, any>;
}

export interface StatsUpdateInput {
  customMetrics?: Record<string, any>;
}
