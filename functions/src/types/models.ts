import { Timestamp } from "firebase-admin/firestore";

// Domain Models
export interface Fingerprint {
  id: string;
  fingerprint: string;
  roles: string[];
  tags: string[];
  metadata: Record<string, any>;
  ipAddresses: string[];
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  lastVisited: Timestamp; // Converted to Unix timestamp for API responses
  ipMetadata: {
    primaryIp?: string;
    ipFrequency: Record<string, number>;
    lastSeenAt: Record<string, Timestamp>; // Converted to Unix timestamp for API responses
    suspiciousIps: string[];
  };
}

export interface ApiKey {
  id: string;
  key: string;
  fingerprintId: string;
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  active: boolean;
}

export interface Visit {
  id: string;
  fingerprintId: string;
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  url: string;
  title?: string;
  siteId: string;
  clientIp?: string;
}

export interface Presence {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites: string[];
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  lastUpdated: number;
}

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceHistory {
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  price: number;
}

export interface Impression {
  id: string;
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  source?: string;
  sessionId?: string;
}

export interface Site {
  id: string;
  domain: string;
  fingerprintId: string;
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  lastVisited: Timestamp; // Converted to Unix timestamp for API responses
  title?: string;
  visits: number;
  settings: {
    notifications: boolean;
    privacy: "public" | "private";
  };
}

export interface PresenceData {
  status: "online" | "offline";
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  lastUpdated: number;
}

export interface FingerprintPresence {
  fingerprintId: string;
  status: "online" | "offline";
  createdAt: Timestamp; // Converted to Unix timestamp for API responses
  lastUpdated: number;
}
