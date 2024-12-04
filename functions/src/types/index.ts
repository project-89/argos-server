import { Timestamp, FieldValue } from "firebase-admin/firestore";

export type PredefinedRole =
  | "user"
  | "agent-initiate"
  | "agent-field"
  | "agent-senior"
  | "agent-master";

export type MatrixIntegrity = "STABLE" | "FLUCTUATING" | "UNSTABLE" | "CRITICAL";

export type TimeFrame = "1h" | "24h" | "7d";
export type Interval = "1m" | "15m" | "1h" | "4h" | "1d";

// Type for Firestore timestamp fields that can be either Timestamp or FieldValue
export type TimestampField = Timestamp | FieldValue;

// Event types
export interface ScheduledEvent {
  scheduleTime: string;
  retry?: {
    count: number;
    maxRetries: number;
  };
}

export interface FirestoreEvent<T> {
  data: T;
  params: {
    docId: string;
  };
}

// Data models
export interface Fingerprint {
  id: string;
  fingerprint: string;
  createdAt: TimestampField;
  metadata?: Record<string, any>;
  roles: PredefinedRole[];
  tags: Record<string, any>;
  apiKeys?: string[];
}

export interface Visit {
  id: string;
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp: number;
  createdAt: TimestampField;
}

export interface ApiKey {
  key: string;
  name: string;
  fingerprintId: string;
  metadata: Record<string, any>;
  createdAt: TimestampField;
  lastUsed: TimestampField | null;
  enabled: boolean;
  usageCount: number;
  endpointStats: Record<string, number>;
}

export interface Presence {
  fingerprintId: string;
  lastActive: number;
  status: "online" | "offline";
  updatedAt: TimestampField;
  currentSites?: string[];
}

export interface PriceData {
  timestamp: number;
  price: number;
}

export interface RealityStabilityResponse {
  realityStabilityIndex: number;
  resistanceLevel: number;
  metadata: {
    currentPrice: number;
    shortTermChange: number;
    mediumTermChange: number;
    recentVolatility: number;
    resistanceImpact: number;
    simulationResponse: number;
    matrixIntegrity: MatrixIntegrity;
    timestamp: number;
  };
}

// API Response Types
export interface SuccessResponse {
  success: true;
  message?: string;
  roles?: PredefinedRole[];
}

export interface ErrorResponse {
  error: string;
}

export interface ApiKeyResponse extends SuccessResponse {
  apiKey: string;
  fingerprintId: string;
  message: string;
}

export interface PriceResponse {
  [symbol: string]: {
    usd: number;
  };
}

// Configuration Types
export interface CacheConfig {
  maxAge: number;
  cleanupInterval: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  monthlyLimit: number;
  buffer: number;
}

export interface RoleResponse {
  success: true;
  roles: PredefinedRole[];
}

// Request body types
export interface RegisterApiKeyRequest {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
  agentType?: string;
}

export interface RegisterFingerprintRequest {
  fingerprint: string;
  metadata?: Record<string, any>;
}

export interface LogVisitRequest {
  fingerprintId: string;
  url: string;
  title?: string;
  timestamp?: number;
}

export interface UpdatePresenceRequest {
  fingerprintId: string;
  status: "online" | "offline";
  currentSites?: string[];
}

export interface RemoveSiteRequest {
  fingerprintId: string;
  siteId: string;
}

export interface AssignRoleRequest {
  fingerprintId: string;
  role: PredefinedRole;
}

export interface UpdateTagsRequest {
  fingerprintId: string;
  tags: Record<string, any>;
}

export interface UpdateRolesByTagsRequest {
  fingerprintId: string;
  tagRules: Record<string, PredefinedRole>;
}

export interface UpdateRolesParams {
  fingerprintId: string;
  role?: PredefinedRole;
  tagRules?: Record<string, PredefinedRole>;
  tags?: Record<string, any>;
}
