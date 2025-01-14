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
  INVALID_API_KEY: "Invalid API key",
  MISSING_API_KEY: "Missing API key",
  INVALID_FINGERPRINT: "Invalid fingerprint",
  MISSING_FINGERPRINT: "Missing fingerprint",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  INTERNAL_ERROR: "Internal server error",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
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
