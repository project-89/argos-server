// Account related errors
export const ACCOUNT_ERRORS = {
  ACCOUNT_ALREADY_EXISTS: "Account with this wallet address already exists",
  ACCOUNT_NOT_FOUND: "Account not found",
  INVALID_SIGNATURE: "Invalid wallet signature",
  FINGERPRINT_ALREADY_LINKED: "Fingerprint is already linked to another account",
  FINGERPRINT_NOT_LINKED: "Fingerprint is not linked to this account",
  FAILED_TO_CREATE_ACCOUNT: "Failed to create account",
  FAILED_TO_GET_ACCOUNT: "Failed to get account",
  FAILED_TO_UPDATE_ACCOUNT: "Failed to update account",
  FAILED_TO_LINK_FINGERPRINT: "Failed to link fingerprint",
  FAILED_TO_UNLINK_FINGERPRINT: "Failed to unlink fingerprint",
  FAILED_TO_VERIFY_ACCOUNT_OWNERSHIP: "Failed to verify account ownership",
} as const;

// Profile related errors
export const PROFILE_ERRORS = {
  FAILED_TO_CREATE_PROFILE: "Failed to create profile",
  FAILED_TO_GET_PROFILE: "Failed to get profile",
  FAILED_TO_UPDATE_PROFILE: "Failed to update profile",
  FAILED_TO_DELETE_PROFILE: "Failed to delete profile",
  FAILED_TO_SEARCH_PROFILES: "Failed to search profiles",
  PROFILE_NOT_FOUND: "Profile not found",
  PROFILE_EXISTS: "Profile already exists for this wallet address",
  PROFILE_NOT_FOUND_FOR_WALLET: "Profile not found for wallet address",
} as const;

// Authentication and Authorization errors
export const AUTH_ERRORS = {
  AUTHENTICATION_REQUIRED: "Authentication required",
  ADMIN_REQUIRED: "Admin role required",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  INVALID_TOKEN: "Invalid or expired token",
  TOKEN_REQUIRED: "Authentication token is required",
  TOKEN_NOT_FOUND: "Token not found",
  INVALID_TOKEN_FORMAT: "Invalid token format",
} as const;

// Operation related errors
export const OPERATION_ERRORS = {
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
  FAILED_TO_CLEANUP_RATE_LIMITS: "Failed to cleanup rate limits",
  FAILED_TO_CLEANUP_DATA: "Failed to cleanup data",
  FAILED_TO_ANALYZE_VISIT_PATTERNS: "Failed to analyze visit patterns",
  FAILED_TO_FIND_SIMILAR_SKILLS: "Failed to find similar skills",
  FAILED_TO_GET_AVAILABLE_ROLES: "Failed to get available roles",
  FAILED_TO_GET_STATS: "Failed to get stats",
  FAILED_TO_UPDATE_STATS: "Failed to update stats",
} as const;

// Validation errors
export const VALIDATION_ERRORS = {
  INVALID_QUERY: "Invalid query parameters",
  INVALID_PARAMS: "Invalid path parameters",
  INVALID_REQUEST: "Invalid request",
  MISSING_METADATA: "Metadata is required",
  INVALID_METADATA: "Expected object, received string",
  REQUIRED_FIELD: "Required",
  MISSING_URL: "URL is required",
  INVALID_URL: "Invalid URL format",
  MISSING_TITLE: "Title is required",
  MISSING_STATUS: "Status is required",
  INVALID_STATUS: "Status must be either 'online', 'offline', or 'away'",
  MISSING_FINGERPRINT: "Fingerprint is required",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",
} as const;

// System errors
export const SYSTEM_ERRORS = {
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  UNKNOWN_ERROR: "Unknown error occurred",
  CORS_ERROR: "Request origin not allowed",
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal server error",
  INVALID_INPUT: "Invalid input",
} as const;

// Feature specific errors
export const FEATURE_ERRORS = {
  // Fingerprint
  FINGERPRINT_NOT_FOUND: "Fingerprint not found",
  INVALID_FINGERPRINT: "Invalid fingerprint",
  FINGERPRINT_EXISTS: "Fingerprint already exists",
  FINGERPRINT_MUST_BE_STRING: "Fingerprint must be a string",
  TARGET_FINGERPRINT_ID_REQUIRED: "Target fingerprint ID is required",
  FAILED_TO_REGISTER_FINGERPRINT: "Failed to register fingerprint",
  TRANSITORY_FINGERPRINT_NOT_FOUND: "Transitory fingerprint record not found",

  // Tag
  TAGGER_NOT_FOUND: "Tagger not found",
  NOT_IT: "You're not it",
  CANNOT_TAG_SELF: "Cannot tag yourself",
  ALREADY_TAGGED: "Target is already tagged",
  NO_REMAINING_TAGS: "No tags remaining",
  NO_TAGS_REMAINING: "No tags remaining",
  NO_TAGS_REMAINING_GAME: "No tags remaining in the game",
  MISSING_TAGS: "At least one tag must be provided",
  INVALID_TAG_TYPE: "Invalid tag type. Must be one of the allowed types.",
  TAG_NOT_FOUND: "Tag not found",

  // Site
  SITE_NOT_FOUND: "Site not found",
  PERMISSION_REQUIRED: "Permission required",

  // Capability
  CAPABILITY_EXISTS: "Capability already exists for this profile",
  SIMILAR_CAPABILITY_EXISTS: "A similar capability already exists",
  INVALID_SKILL_LEVEL: "Skill level must be between 1 and 100",
  CAPABILITY_ALREADY_VERIFIED: "Capability is already verified",
  ALREADY_ENDORSED: "Already endorsed this capability",
  SKILL_NAME_REQUIRED: "Skill name is required",
  SKILL_NAME_TOO_LONG: "Skill name is too long",
  SKILL_DESCRIPTION_TOO_LONG: "Skill description is too long",
  FAILED_TO_CREATE_CAPABILITY: "Failed to create capability",
  FAILED_TO_GET_CAPABILITIES: "Failed to get capabilities",
  FAILED_TO_UPDATE_CAPABILITY: "Failed to update capability",
  FAILED_TO_DELETE_CAPABILITY: "Failed to delete capability",

  // Price
  PRICE_DATA_NOT_FOUND: "Price data not found",
  FAILED_GET_TOKEN_PRICE: "Failed to get token price",
  FAILED_GET_PRICE_HISTORY: "Failed to get price history",
  ALL_PRICE_FETCHES_FAILED: "All price fetches failed",

  // Profile
  PROFILE_NOT_FOUND: "Profile not found",
  PROFILE_EXISTS: "Profile already exists",
  USERNAME_TAKEN: "Username already taken",

  // Role
  FAILED_ASSIGN_ROLE: "Failed to assign role",
  CANNOT_REMOVE_USER_ROLE: "Cannot remove user role",

  // Stats
  STATS_NOT_FOUND: "Stats not found",
} as const;

// Export all error types
export type AccountError = (typeof ACCOUNT_ERRORS)[keyof typeof ACCOUNT_ERRORS];
export type ProfileError = (typeof PROFILE_ERRORS)[keyof typeof PROFILE_ERRORS];
export type AuthError = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS];
export type OperationError = (typeof OPERATION_ERRORS)[keyof typeof OPERATION_ERRORS];
export type ValidationError = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS];
export type SystemError = (typeof SYSTEM_ERRORS)[keyof typeof SYSTEM_ERRORS];
export type FeatureError = (typeof FEATURE_ERRORS)[keyof typeof FEATURE_ERRORS];

// Combine all errors into a single object for backward compatibility
export const ERROR_MESSAGES = {
  ...ACCOUNT_ERRORS,
  ...PROFILE_ERRORS,
  ...AUTH_ERRORS,
  ...OPERATION_ERRORS,
  ...VALIDATION_ERRORS,
  ...SYSTEM_ERRORS,
  ...FEATURE_ERRORS,
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
