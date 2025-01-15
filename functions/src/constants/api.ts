export const API_VERSION = "v1";

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  // Auth errors
  INVALID_API_KEY: "Invalid API key",
  MISSING_API_KEY: "API key is required",
  INSUFFICIENT_PERMISSIONS: "API key does not match fingerprint",
  CORS_ERROR: "Request origin not allowed",
  AUTHENTICATION_REQUIRED: "Authentication required",
  ADMIN_REQUIRED: "Admin role required",
  PERMISSION_REQUIRED: "Required permission not found",

  // Resource errors
  NOT_FOUND: "Resource not found",
  FINGERPRINT_NOT_FOUND: "Fingerprint not found",
  INVALID_FINGERPRINT: "Invalid fingerprint",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",
  MISSING_FINGERPRINT: "Fingerprint is required",
  CANNOT_REMOVE_USER_ROLE: "Cannot remove user role",
  DATABASE_NOT_READY: "Database index not ready. Please try again in a few minutes.",
  SITE_NOT_FOUND: "Site not found",

  // Operation errors
  FAILED_CREATE_IMPRESSION: "Failed to create impression",
  FAILED_GET_IMPRESSIONS: "Failed to get impressions",
  FAILED_DELETE_IMPRESSIONS: "Failed to delete impressions",
  FAILED_UPDATE_PRESENCE: "Failed to update presence status",
  FAILED_GET_PRESENCE: "Failed to get presence status",
  FAILED_ASSIGN_ROLE: "Failed to assign role",
  FAILED_REMOVE_ROLE: "Failed to remove role",
  FAILED_LOG_VISIT: "Failed to log visit",
  FAILED_UPDATE_PRESENCE_STATUS: "Failed to update presence status",
  FAILED_REMOVE_SITE: "Failed to remove site",
  FAILED_GET_VISIT_HISTORY: "Failed to get visit history",
  FAILED_CALCULATE_STABILITY: "Failed to calculate reality stability index",

  // Validation errors
  INVALID_REQUEST: "Invalid request data",
  INVALID_QUERY: "Invalid query parameters",
  INVALID_PARAMS: "Invalid path parameters",
  MISSING_METADATA: "Metadata is required",
  INVALID_METADATA: "Expected object, received string",
  REQUIRED_FIELD: "Required",
  MISSING_URL: "URL is required",
  INVALID_URL: "Invalid URL format",
  MISSING_TITLE: "Title is required",
  MISSING_STATUS: "Status is required",
  INVALID_STATUS: "Status must be either 'online' or 'offline'",

  // System errors
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  INTERNAL_ERROR: "Internal server error",
  UNKNOWN_ERROR: "Unknown error occurred",

  MISSING_TAGS: "At least one tag must be provided",
  INVALID_TAG_TYPE: "Expected string, received number",

  PRICE_DATA_NOT_FOUND: "No price data found for invalid-token",
  TOKEN_NOT_FOUND: "Token not found",
} as const;

export const ENDPOINTS = {
  API_KEY: "/api-key",
  FINGERPRINT: "/fingerprint",
  VISIT: "/visit",
  PRESENCE: "/presence",
  ROLE: "/role",
  TAGS: "/tags",
  PRICE: "/price",
  STABILITY: "/stability",
} as const;

export const PRICE_API_URL = "https://api.coingecko.com/api/v3/simple/price";

// Public endpoints that should not require API key authentication
export const PUBLIC_ENDPOINTS: readonly string[] = [
  "/fingerprint/register",
  "/api-key/register",
  "/api-key/validate",
  "/role/available",
  "/price/current",
  "/price/history/:tokenId",
  "/reality-stability",
];
