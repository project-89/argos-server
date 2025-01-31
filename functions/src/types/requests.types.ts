// API Request Types
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
  role: string;
}

export interface UpdateTagsRequest {
  fingerprintId: string;
  tags: Record<string, any>;
}

export interface UpdateRolesByTagsRequest {
  fingerprintId: string;
  tagRules: Record<string, string>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
