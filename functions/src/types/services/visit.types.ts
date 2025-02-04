import { Site, Visit } from "../models/models.types";

/**
 * Visit Tracking
 */

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
  createdAt: number;
}

export interface VisitResponse extends Omit<Visit, "id" | "createdAt"> {
  createdAt: number;
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
