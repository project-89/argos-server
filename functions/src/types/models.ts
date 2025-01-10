import { Timestamp } from "firebase-admin/firestore";

// Domain Models
export interface Fingerprint {
  id: string;
  fingerprint: string;
  roles: string[];
  tags: string[];
  metadata: Record<string, any>;
  ipAddresses: string[];
  createdAt: Timestamp; // Internal Firestore timestamp
  ipMetadata: {
    primaryIp?: string;
    ipFrequency: Record<string, number>;
    lastSeenAt: Record<string, Timestamp>; // Internal Firestore timestamp
    suspiciousIps: string[];
  };
}

export interface ApiKey {
  id: string;
  key: string;
  fingerprintId: string;
  createdAt: Timestamp; // Internal Firestore timestamp
  active: boolean;
}

export interface Visit {
  id: string;
  fingerprintId: string;
  createdAt: Timestamp; // Internal Firestore timestamp
  url: string;
  title?: string;
  siteId: string;
  clientIp?: string;
}

export interface Presence {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites: string[];
  createdAt: Timestamp; // Internal Firestore timestamp
  lastUpdated: number; // Unix timestamp for API responses
}

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceHistory {
  createdAt: Timestamp; // Internal Firestore timestamp
  price: number;
}

export interface Impression {
  id: string;
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  createdAt: Timestamp; // Internal Firestore timestamp
  source?: string;
  sessionId?: string;
}

export interface Site {
  id: string;
  domain: string;
  fingerprintId: string;
  createdAt: Timestamp; // Internal Firestore timestamp
  lastVisited: number; // Unix timestamp for API responses
  title?: string;
  visits: number;
  settings: {
    notifications: boolean;
    privacy: "public" | "private";
  };
}

export interface PresenceData {
  status: "online" | "offline";
  createdAt: Timestamp; // Internal Firestore timestamp
  lastUpdated: number; // Unix timestamp for API responses
}

export interface FingerprintPresence {
  fingerprintId: string;
  status: "online" | "offline";
  createdAt: Timestamp; // Internal Firestore timestamp
  lastUpdated: number; // Unix timestamp for API responses
}
