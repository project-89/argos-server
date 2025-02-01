/**
 * Visit and Site Tracking Types
 * Contains types for tracking user visits, site data, and presence
 */

import { Timestamp } from "firebase-admin/firestore";
import { Site } from "./models";

/**
 * Visit Tracking
 */

export interface Visit {
  fingerprintId: string;
  url: string;
  title: string | undefined;
  siteId: string;
  clientIp?: string;
  createdAt: Timestamp;
}

export interface VisitHistoryResponse {
  id: string;
  fingerprintId: string;
  createdAt: number; // Unix timestamp
  lastUpdated?: number; // Unix timestamp
  url: string;
  title?: string;
  siteId: string;
  site?: SiteResponse;
}

export interface SiteResponse extends Omit<Site, "lastVisited" | "createdAt"> {
  lastVisited: number; // Unix timestamp
  createdAt: number; // Unix timestamp
}
/**
 * Presence Tracking
 */
export interface UpdatePresenceRequest {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites?: string[];
}

export interface VisitPresence {
  fingerprintId: string;
  status: "online" | "offline" | "away";
  lastUpdated: number; // Unix timestamp for tracking last activity/status update
  createdAt: number; // Unix timestamp for tracking last activity/status update
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
  analyzedAt: Timestamp;
}

/**
 * Visit Endpoints
 */
export const VISIT_ENDPOINTS = {
  LOG_VISIT: "/visit/log",
  UPDATE_PRESENCE: "/visit/presence",
  GET_VISIT_HISTORY: "/visit/history/:fingerprintId",
  REMOVE_SITE: "/visit/site/remove",
} as const;
