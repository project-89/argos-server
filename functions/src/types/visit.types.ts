/**
 * Visit and Site Tracking Types
 * Contains types for tracking user visits, site data, and presence
 */

import { Timestamp } from "firebase-admin/firestore";
import { Site as SiteModel, Visit as VisitModel } from "./models";

/**
 * Visit Tracking
 */
export interface LogVisitRequest {
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp?: number; // Unix timestamp
}

export interface VisitResponse extends Omit<VisitModel, "createdAt"> {
  createdAt: number; // Unix timestamp for API responses
}

export interface VisitHistoryResponse {
  id: string;
  fingerprintId: string;
  createdAt: number; // Unix timestamp
  url: string;
  title?: string;
  siteId: string;
  site?: SiteResponse;
}

export interface VisitData {
  id: string;
  fingerprintId: string;
  siteId: string;
  createdAt: Timestamp;
}

/**
 * Site Management
 */
export interface SiteResponse extends Omit<SiteModel, "createdAt" | "lastVisited"> {
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
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

/**
 * Visit Analysis
 */
export interface VisitPattern {
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
  lastEngagement: Timestamp;
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
