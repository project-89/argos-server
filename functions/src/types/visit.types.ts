/**
 * Visit and Site Tracking Types
 * Contains types for tracking user visits, site data, and presence
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Visit Tracking
 */
export interface LogVisitRequest {
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp?: number; // Unix timestamp
}

export interface ApiVisit {
  id: string;
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
  url: string;
  title?: string;
  siteId: string;
  site?: SiteModel;
}

export interface ApiVisitData {
  id: string;
  fingerprintId: string;
  siteId: string;
  createdAt: Timestamp;
}

/**
 * Site Management
 */
export interface ApiSite {
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

export interface SiteModel extends Omit<ApiSite, "lastVisited" | "createdAt"> {
  id: string;
  lastVisited: number; // Unix timestamp for API responses
  createdAt: number; // Unix timestamp for API responses
}

export interface RemoveSiteRequest {
  fingerprintId: string;
  siteId: string;
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
}

/**
 * Visit Analysis
 */
export interface ApiVisitPattern {
  currentSite: string;
  nextSite: string;
  transitionCount: number;
  averageTimeSpent: number;
  lastTransition: Timestamp;
}

export interface SiteEngagement {
  siteId: string;
  totalVisits: number;
  averageTimeSpent: number;
  returnRate: number;
  commonNextSites: string[];
}

export interface VisitAnalysis {
  patterns: ApiVisitPattern[];
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
