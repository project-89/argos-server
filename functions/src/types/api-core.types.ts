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
