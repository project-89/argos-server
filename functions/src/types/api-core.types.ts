/**
 * Core API Response Types
 * Contains the fundamental response types used across all API endpoints
 */

/**
 * Standard API Response Format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  requestId: string;
  timestamp: number; // Unix timestamp
  details?: any[];
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  requestId: string;
  timestamp: number;
  details?: Array<{
    code: string;
    path: (string | number)[];
    message: string;
    expected?: string | undefined;
    received?: string | undefined;
  }>;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Simple API Response type (for backwards compatibility)
 */
export interface SimpleApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Error Codes and Messages
 */
export const API_ERRORS = {
  BAD_REQUEST: {
    code: 400,
    message: "Invalid parameters provided",
  },
  UNAUTHORIZED: {
    code: 401,
    message: "Missing or invalid API key",
  },
  FORBIDDEN: {
    code: 403,
    message: "API key does not match fingerprint",
  },
  NOT_FOUND: {
    code: 404,
    message: "Resource not found",
  },
  RATE_LIMIT_EXCEEDED: {
    code: 429,
    message: "Rate limit exceeded",
  },
  INTERNAL_ERROR: {
    code: 500,
    message: "Internal server error",
  },
} as const;
