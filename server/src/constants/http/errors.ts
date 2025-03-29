// Account related errors
export const ACCOUNT_ERRORS = {
  ACCOUNT_ALREADY_EXISTS: "Account with this wallet address already exists",
  ACCOUNT_NOT_FOUND: "Account not found",
  INVALID_SIGNATURE: "Invalid wallet signature",
  FINGERPRINT_ALREADY_LINKED: "Fingerprint is already linked to another account",
  FINGERPRINT_NOT_LINKED: "Fingerprint is not linked to this account",
  FINGERPRINT_MISMATCH: "Fingerprint ID does not match onboarding record",
  SOCIAL_IDENTITY_REQUIRED: "Verified social identity is required to create account",
  FAILED_TO_CREATE_ACCOUNT: "Failed to create account",
  FAILED_TO_GET_ACCOUNT: "Failed to get account",
  FAILED_TO_UPDATE_ACCOUNT: "Failed to update account",
  FAILED_TO_DELETE_ACCOUNT: "Failed to delete account",
  FAILED_TO_LINK_FINGERPRINT: "Failed to link fingerprint",
  FAILED_TO_UNLINK_FINGERPRINT: "Failed to unlink fingerprint",
  FAILED_TO_VERIFY_ACCOUNT_OWNERSHIP: "Failed to verify account ownership",
  ACCOUNT_HAS_AGENTS: "Account has associated agents and cannot be deleted",
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
  USERNAME_TAKEN: "Username already taken",
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
  PERMISSION_REQUIRED: "Permission required",
} as const;

// Operation related errors
export const OPERATION_ERRORS = {
  // Should move to FEATURE_ERRORS.Impression
  FAILED_CREATE_IMPRESSION: "Failed to create impression",
  FAILED_GET_IMPRESSIONS: "Failed to get impressions",
  FAILED_DELETE_IMPRESSIONS: "Failed to delete impressions",

  // Should move to FEATURE_ERRORS.Presence
  FAILED_UPDATE_PRESENCE: "Failed to update presence status",
  FAILED_GET_PRESENCE: "Failed to get presence status",
  FAILED_UPDATE_PRESENCE_STATUS: "Failed to update presence status",
  FAILED_UPDATE_ACTIVITY: "Failed to update activity timestamp",

  // Should move to FEATURE_ERRORS.Role
  FAILED_REMOVE_ROLE: "Failed to remove role",
  FAILED_TO_GET_AVAILABLE_ROLES: "Failed to get available roles",

  // Should move to FEATURE_ERRORS.Visit/Site
  FAILED_LOG_VISIT: "Failed to log visit",
  FAILED_REMOVE_SITE: "Failed to remove site",
  FAILED_GET_VISIT_HISTORY: "Failed to get visit history",

  // Should move to FEATURE_ERRORS.Stats
  FAILED_CALCULATE_STABILITY: "Failed to calculate reality stability index",
  FAILED_TO_GET_STATS: "Failed to get stats",
  FAILED_TO_UPDATE_STATS: "Failed to update stats",

  // Should move to FEATURE_ERRORS.Skills
  FAILED_TO_FIND_SIMILAR_SKILLS: "Failed to find similar skills",

  // These can stay as they're truly operational
  FAILED_TO_CLEANUP_RATE_LIMITS: "Failed to cleanup rate limits",
  FAILED_TO_CLEANUP_DATA: "Failed to cleanup data",
  FAILED_TO_ANALYZE_VISIT_PATTERNS: "Failed to analyze visit patterns",
} as const;

// Validation errors
export const VALIDATION_ERRORS = {
  // These should move to FEATURE_ERRORS.Fingerprint
  MISSING_FINGERPRINT: "Fingerprint is required",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",

  // These can stay as they're generic validation
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
  FAILED_TO_VALIDATE_INVITE: "Failed to validate invite",
};

// System errors
export const SYSTEM_ERRORS = {
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  UNKNOWN_ERROR: "Unknown error occurred",
  CORS_ERROR: "Request origin not allowed",
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal server error",
  INVALID_INPUT: "Invalid input",
  INVALID_REQUEST: "Invalid request",
} as const;

// Feature specific errors
export const FEATURE_ERRORS = {
  // User
  USER_NOT_FOUND: "User not found",

  // Mission
  FAILED_TO_CREATE_MISSION: "Failed to create mission",
  FAILED_TO_GET_MISSION: "Failed to get mission",
  FAILED_TO_UPDATE_MISSION: "Failed to update mission",
  FAILED_TO_DELETE_MISSION: "Failed to delete mission",
  MISSION_NOT_FOUND: "Mission not found",
  FAILED_TO_GET_AVAILABLE_MISSIONS: "Failed to get available missions",
  FAILED_TO_GET_ACTIVE_MISSIONS: "Failed to get active missions",
  FAILED_TO_UPDATE_MISSION_STATUS: "Failed to update mission status",
  FAILED_TO_UPDATE_MISSION_OBJECTIVES: "Failed to update mission objectives",
  FAILED_TO_ADD_FAILURE_RECORD: "Failed to add failure record",
  FINGERPRINT_REQUIRED: "Fingerprint ID is required",

  // Fingerprint
  FINGERPRINT_NOT_FOUND: "Fingerprint not found",
  FINGERPRINT_ALREADY_EXISTS: "Fingerprint already exists",
  FAILED_TO_SAVE_FINGERPRINT: "Failed to save fingerprint",
  FAILED_TO_GET_FINGERPRINT: "Failed to get fingerprint",
  FAILED_TO_UPDATE_FINGERPRINT: "Failed to update fingerprint",
  FAILED_TO_REGISTER_FINGERPRINT: "Failed to register fingerprint",
  TRANSITORY_FINGERPRINT_NOT_FOUND: "Transitory fingerprint record not found",
  MISSING_FINGERPRINT: "Fingerprint is required",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",

  // Impression
  FAILED_CREATE_IMPRESSION: "Failed to create impression",
  FAILED_GET_IMPRESSIONS: "Failed to get impressions",
  FAILED_DELETE_IMPRESSIONS: "Failed to delete impressions",

  // Presence
  FAILED_UPDATE_PRESENCE: "Failed to update presence status",
  FAILED_GET_PRESENCE: "Failed to get presence status",
  FAILED_UPDATE_PRESENCE_STATUS: "Failed to update presence status",
  FAILED_UPDATE_ACTIVITY: "Failed to update activity timestamp",

  // Visit
  FAILED_LOG_VISIT: "Failed to log visit",
  FAILED_GET_VISIT_HISTORY: "Failed to get visit history",

  // Site
  SITE_NOT_FOUND: "Site not found",
  FAILED_REMOVE_SITE: "Failed to remove site",

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

  // Capability/Skills
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
  FAILED_TO_FIND_SIMILAR_SKILLS: "Failed to find similar skills",

  // Price
  PRICE_DATA_NOT_FOUND: "Price data not found",
  FAILED_GET_TOKEN_PRICE: "Failed to get token price",
  FAILED_GET_PRICE_HISTORY: "Failed to get price history",
  ALL_PRICE_FETCHES_FAILED: "All price fetches failed",

  // Role
  FAILED_ASSIGN_ROLE: "Failed to assign role",
  CANNOT_REMOVE_USER_ROLE: "Cannot remove user role",
  FAILED_REMOVE_ROLE: "Failed to remove role",
  FAILED_TO_GET_AVAILABLE_ROLES: "Failed to get available roles",

  // Stats
  STATS_NOT_FOUND: "Stats not found",
  FAILED_TO_GET_STATS: "Failed to get stats",
  FAILED_TO_UPDATE_STATS: "Failed to update stats",
  FAILED_CALCULATE_STABILITY: "Failed to calculate reality stability index",

  // Onboarding
  FAILED_TO_START_ONBOARDING: "Failed to start onboarding process",
  FAILED_TO_GET_ONBOARDING: "Failed to get onboarding progress",
  FAILED_TO_UPDATE_ONBOARDING: "Failed to update onboarding progress",
  FAILED_TO_COMPLETE_ONBOARDING: "Failed to complete onboarding",
  FAILED_TO_VERIFY_MISSION: "Failed to verify mission completion",
  ONBOARDING_NOT_FOUND: "Onboarding process not found",
  ONBOARDING_ALREADY_COMPLETED: "Onboarding process already completed",
  MISSION_ALREADY_COMPLETED: "Mission already completed",
  INVALID_MISSION_PROOF: "Invalid mission completion proof",
  INVALID_MISSION_ORDER: "Invalid mission completion order",
} as const;

// Agent related errors
export const AGENT_ERRORS = {
  AGENT_NOT_FOUND: "Agent not found",
  AGENT_NOT_ACTIVE: "Agent is not active",
  AGENT_ALREADY_ACTIVATED: "Agent is already activated",
  INSUFFICIENT_CAPABILITIES: "Agent does not have required capabilities",
  AGENT_AUTHENTICATION_REQUIRED: "Agent authentication required",
  FAILED_TO_REGISTER_AGENT: "Failed to register agent",
  FAILED_TO_ACTIVATE_AGENT: "Failed to activate agent",
  FAILED_TO_GET_AGENT: "Failed to get agent",
  FAILED_TO_UPDATE_AGENT: "Failed to update agent",
  FAILED_TO_DELETE_AGENT: "Failed to delete agent",
  FAILED_TO_UPDATE_AGENT_STATE: "Failed to update agent state",
  FAILED_TO_LIST_AGENTS: "Failed to list agents",
  FAILED_TO_GET_AGENTS_BY_CAPABILITY: "Failed to get agents by capability",
  FAILED_TO_CREATE_AGENT: "Failed to create agent",
} as const;

// Fingerprint related errors
export const FINGERPRINT_ERRORS = {
  FINGERPRINT_NOT_FOUND: "Fingerprint not found",
  FINGERPRINT_EXISTS: "Fingerprint already exists",
  FINGERPRINT_ALREADY_EXISTS: "Fingerprint already exists",
  FAILED_TO_SAVE_FINGERPRINT: "Failed to save fingerprint",
  FAILED_TO_GET_FINGERPRINT: "Failed to get fingerprint",
  FAILED_TO_UPDATE_FINGERPRINT: "Failed to update fingerprint",
  FAILED_TO_REGISTER_FINGERPRINT: "Failed to register fingerprint",
  TRANSITORY_FINGERPRINT_NOT_FOUND: "Transitory fingerprint record not found",
  MISSING_FINGERPRINT: "Fingerprint is required",
  INVALID_FINGERPRINT_DATA: "Invalid fingerprint data",
  INVALID_FINGERPRINT: "Invalid fingerprint",
  FINGERPRINT_MUST_BE_STRING: "Fingerprint must be a string",
  FINGERPRINT_REQUIRED: "Fingerprint ID is required",
} as const;

// Export all error types
export type AccountError = (typeof ACCOUNT_ERRORS)[keyof typeof ACCOUNT_ERRORS];
export type ProfileError = (typeof PROFILE_ERRORS)[keyof typeof PROFILE_ERRORS];
export type AuthError = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS];
export type OperationError = (typeof OPERATION_ERRORS)[keyof typeof OPERATION_ERRORS];
export type ValidationError = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS];
export type SystemError = (typeof SYSTEM_ERRORS)[keyof typeof SYSTEM_ERRORS];
export type FeatureError = (typeof FEATURE_ERRORS)[keyof typeof FEATURE_ERRORS];
export type AgentError = (typeof AGENT_ERRORS)[keyof typeof AGENT_ERRORS];
export type FingerprintError = (typeof FINGERPRINT_ERRORS)[keyof typeof FINGERPRINT_ERRORS];

// Combine all errors into a single object for backward compatibility
export const ERROR_MESSAGES = {
  ...ACCOUNT_ERRORS,
  ...PROFILE_ERRORS,
  ...AUTH_ERRORS,
  ...OPERATION_ERRORS,
  ...VALIDATION_ERRORS,
  ...SYSTEM_ERRORS,
  ...FEATURE_ERRORS,
  ...AGENT_ERRORS,
  ...FINGERPRINT_ERRORS,

  // Agent errors
  AGENT_NOT_FOUND: "Agent not found",
  AGENT_NOT_ACTIVE: "Agent is not active",
  AGENT_ALREADY_ACTIVATED: "Agent is already activated",
  INSUFFICIENT_CAPABILITIES: "Agent does not have required capabilities",
  AGENT_AUTHENTICATION_REQUIRED: "Agent authentication required",
  FAILED_TO_CREATE_AGENT: "Failed to create agent",
  FAILED_TO_ACTIVATE_AGENT: "Failed to activate agent",

  // Invite errors
  FAILED_TO_CREATE_INVITE: "Failed to create agent invite",
  INVITE_NOT_FOUND: "Invite code not found",
  INVITE_REVOKED: "This invite has been revoked",
  INVITE_EXHAUSTED: "This invite has reached its maximum uses",
  INVITE_EXPIRED: "This invite has expired",
  INVITE_INVALID: "This invite is no longer valid",
  FAILED_TO_REVOKE_INVITE: "Failed to revoke invite",

  // Knowledge encapsulation errors
  INSUFFICIENT_RANK: "Agent does not have sufficient rank for this operation",
  KNOWLEDGE_NOT_FOUND: "Knowledge not found",
  KNOWLEDGE_ACCESS_DENIED: "Access to this knowledge is denied",
  FAILED_TO_COMPRESS_KNOWLEDGE: "Failed to compress knowledge",
  FAILED_TO_DECOMPRESS_KNOWLEDGE: "Failed to decompress knowledge",
  FAILED_TO_CREATE_KNOWLEDGE: "Failed to create knowledge",
  FAILED_TO_UPDATE_KNOWLEDGE: "Failed to update knowledge",
  FAILED_TO_SHARE_KNOWLEDGE: "Failed to share knowledge",
  FAILED_TO_TRANSFER_KNOWLEDGE: "Failed to transfer knowledge",
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
