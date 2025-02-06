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

export const SUCCESS_MESSAGES = {
  API_KEY_REGISTERED: "API key registered successfully",
  API_KEY_VALIDATED: "API key validated successfully",
  API_KEY_DEACTIVATED: "API key deactivated successfully",

  IMPRESSION_CREATED: "Impression created successfully",
  IMPRESSIONS_RETRIEVED: "Impressions retrieved successfully",
  IMPRESSIONS_DELETED: "Impressions deleted successfully",
} as const;

export const ERROR_MESSAGES = {
  // Account errors
  ACCOUNT_ALREADY_EXISTS: "Account with this wallet address already exists",
  ACCOUNT_NOT_FOUND: "Account not found",
  INVALID_SIGNATURE: "Invalid wallet signature",
  FINGERPRINT_ALREADY_LINKED: "Fingerprint is already linked to another account",
  FINGERPRINT_NOT_LINKED: "Fingerprint is not linked to this account",

  // Impression errors
  FAILED_TO_CREATE_IMPRESSION: "Failed to create impression",

  // hivemind errors
  PROFILE_NOT_FOUND_FOR_WALLET: "Profile not found for wallet address",

  // API Key errors
  INVALID_API_KEY: "Invalid API key",
  MISSING_API_KEY: "API key is required",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  API_KEY_MUST_BE_STRING: "API key must be a string",
  API_KEY_NOT_FOUND: "API key not found",
  API_KEY_DEACTIVATED: "API key deactivated",
  FAILED_TO_DEACTIVATE_API_KEY: "Failed to deactivate API key",
  FAILED_TO_CREATE_API_KEY: "Failed to create API key",
  FAILED_TO_GET_API_KEY: "Failed to get API key",
  FAILED_TO_VALIDATE_API_KEY: "Failed to validate API key",
  FAILED_TO_REGISTER_API_KEY: "Failed to register API key",

  // Cache errors
  FAILED_TO_GET_CACHED_DATA: "Failed to get cached data",
  FAILED_TO_SET_CACHED_DATA: "Failed to set cached data",

  // Cleanup errors
  FAILED_TO_CLEANUP_DATA: "Failed to cleanup data",
  FAILED_TO_CLEANUP_RATE_LIMITS: "Failed to cleanup rate limits",
  FAILED_TO_ANALYZE_VISIT_PATTERNS: "Failed to analyze visit patterns",

  // CORS errors
  CORS_ERROR: "Request origin not allowed",

  // Fingerprint errors
  FINGERPRINT_NOT_FOUND: "Fingerprint not found",
  INVALID_FINGERPRINT: "Invalid fingerprint",
  FINGERPRINT_EXISTS: "Fingerprint already exists",
  FINGERPRINT_MUST_BE_STRING: "Fingerprint must be a string",
  TARGET_FINGERPRINT_ID_REQUIRED: "Target fingerprint ID is required",
  FAILED_TO_REGISTER_FINGERPRINT: "Failed to register fingerprint",

  // Profile errors
  PROFILE_NOT_FOUND: "Profile not found",
  PROFILE_EXISTS: "Profile already exists for this wallet address",
  WALLET_NOT_FOUND: "Wallet not found",
  USERNAME_TAKEN: "Username is already taken",

  // Stats errors
  STATS_NOT_FOUND: "Stats not found",
  STATS_EXIST: "Stats already exist",

  // Capability errors
  CAPABILITY_EXISTS: "Capability already exists for this profile",
  SIMILAR_CAPABILITY_EXISTS: "A similar capability already exists",
  INVALID_SKILL_LEVEL: "Skill level must be between 1 and 100",
  CAPABILITY_ALREADY_VERIFIED: "Capability is already verified",
  ALREADY_ENDORSED: "Already endorsed this capability",
  SKILL_NAME_REQUIRED: "Skill name is required",
  SKILL_NAME_TOO_LONG: "Skill name is too long",
  SKILL_DESCRIPTION_TOO_LONG: "Skill description is too long",

  // Visit errors
  SITE_NOT_FOUND: "Site not found",
  PERMISSION_REQUIRED: "Permission required",

  // Tag errors
  TAGGER_NOT_FOUND: "Tagger not found",
  NOT_IT: "You're not it",
  CANNOT_TAG_SELF: "Cannot tag yourself",
  ALREADY_TAGGED: "Target is already tagged",
  NO_REMAINING_TAGS: "No tags remaining",
  NO_TAGS_REMAINING: "No tags remaining",
  NO_TAGS_REMAINING_GAME: "No tags remaining in the game",

  // Role errors
  FAILED_ASSIGN_ROLE: "Failed to assign role",

  // Price errors
  PRICE_DATA_NOT_FOUND: "Price data not found",
  FAILED_GET_TOKEN_PRICE: "Failed to get token price",
  ALL_PRICE_FETCHES_FAILED: "All price fetches failed",
  INVALID_REQUEST: "Invalid request",

  // Generic errors
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal server error",
  INVALID_INPUT: "Invalid input",

  // Auth errors
  AUTHENTICATION_REQUIRED: "Authentication required",
  ADMIN_REQUIRED: "Admin role required",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",
  MISSING_FINGERPRINT: "Fingerprint is required",
  CANNOT_REMOVE_USER_ROLE: "Cannot remove user role",
  TAG_NOT_FOUND: "Tag not found",
  // Operation errors
  FAILED_CREATE_IMPRESSION: "Failed to create impression",
  FAILED_GET_IMPRESSIONS: "Failed to get impressions",
  FAILED_DELETE_IMPRESSIONS: "Failed to delete impressions",
  FAILED_UPDATE_PRESENCE: "Failed to update presence status",
  FAILED_GET_PRESENCE: "Failed to get presence status",
  FAILED_REMOVE_ROLE: "Failed to remove role",
  FAILED_LOG_VISIT: "Failed to log visit",
  FAILED_UPDATE_PRESENCE_STATUS: "Failed to update presence status",
  FAILED_REMOVE_SITE: "Failed to remove site",
  FAILED_GET_VISIT_HISTORY: "Failed to get visit history",
  FAILED_CALCULATE_STABILITY: "Failed to calculate reality stability index",
  FAILED_UPDATE_ACTIVITY: "Failed to update activity timestamp",

  // Validation errors
  INVALID_QUERY: "Invalid query parameters",
  INVALID_PARAMS: "Invalid path parameters",
  MISSING_METADATA: "Metadata is required",
  INVALID_METADATA: "Expected object, received string",
  REQUIRED_FIELD: "Required",
  MISSING_URL: "URL is required",
  INVALID_URL: "Invalid URL format",
  MISSING_TITLE: "Title is required",
  MISSING_STATUS: "Status is required",
  INVALID_STATUS: "Status must be either 'online', 'offline', or 'away'",

  // System errors
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  UNKNOWN_ERROR: "Unknown error occurred",

  MISSING_TAGS: "At least one tag must be provided",
  INVALID_TAG_TYPE: "Invalid tag type. Must be one of the allowed types.",

  TOKEN_NOT_FOUND: "Token not found",

  // JWT Auth errors
  INVALID_TOKEN: "Invalid or expired token",
  TOKEN_REQUIRED: "Authentication token is required",
  INVALID_TOKEN_FORMAT: "Invalid token format",
} as const;
