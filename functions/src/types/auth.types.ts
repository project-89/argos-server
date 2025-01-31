/**
 * Authentication Types
 * Contains types for API key management and fingerprint registration
 */

/**
 * API Key Management
 */
export interface RegisterApiKeyRequest {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
  agentType?: string;
}

export interface ApiKeyRegistrationRequest {
  fingerprintId: string;
}

export interface ApiKeyRegistrationResponse {
  key: string;
  fingerprintId: string;
  timestamp: number; // Unix timestamp
}

export interface ApiKeyValidationRequest {
  key: string;
}

export interface ApiKeyValidationResponse {
  isValid: boolean;
  needsRefresh: boolean;
}

/**
 * Fingerprint Registration
 */
// Preserved both naming conventions for compatibility
export interface RegisterFingerprintRequest {
  fingerprint: string;
  metadata?: Record<string, any>;
}

export interface FingerprintRegistrationRequest {
  fingerprint: string;
  metadata?: Record<string, any>;
}

export interface FingerprintRegistrationResponse {
  id: string;
  timestamp: number; // Unix timestamp
}

/**
 * API Endpoints Configuration
 */
export const AUTH_ENDPOINTS = {
  // Authentication
  REGISTER_FINGERPRINT: "/fingerprint/register",
  REGISTER_API_KEY: "/api-key/register",
  VALIDATE_API_KEY: "/api-key/validate",
  REVOKE_API_KEY: "/api-key/revoke",
} as const;

/**
 * Rate Limiting Configuration
 */
export const AUTH_RATE_LIMITS = {
  PUBLIC_ENDPOINTS: {
    REQUESTS_PER_HOUR: 100,
    SCOPE: "IP",
  },
  PROTECTED_ENDPOINTS: {
    REQUESTS_PER_HOUR: 1000,
    SCOPE: "API_KEY",
  },
  HEALTH_ENDPOINTS: {
    REQUESTS_PER_MINUTE: 60,
    SCOPE: "IP",
  },
} as const;
