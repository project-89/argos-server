// Domain Models
export interface Fingerprint {
  fingerprint: string;
  metadata: Record<string, any>;
  roles: string[];
  tags: Record<string, any>;
  createdAt: FirebaseFirestore.Timestamp;
  ipAddresses: string[];
  ipMetadata: {
    primaryIp?: string; // Most frequently used IP
    ipFrequency: Record<string, number>; // Count of requests per IP
    lastSeenAt: Record<string, FirebaseFirestore.Timestamp>; // Last time each IP was seen
    suspiciousIps: string[]; // IPs flagged as potentially suspicious
  };
}

export interface ApiKey {
  key: string;
  name: string;
  fingerprintId: string;
  metadata: Record<string, any>;
  createdAt: FirebaseFirestore.Timestamp;
  lastUsed: FirebaseFirestore.Timestamp | null;
  enabled: boolean;
  usageCount: number;
  endpointStats: Record<string, number>;
}

export interface Visit {
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Presence {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites: string[];
  lastUpdated: FirebaseFirestore.Timestamp;
}

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
}
