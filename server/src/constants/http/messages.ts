export const SUCCESS_MESSAGES = {
  IMPRESSION_CREATED: "Impression created successfully",
  IMPRESSIONS_RETRIEVED: "Impressions retrieved successfully",
  IMPRESSIONS_DELETED: "Impressions deleted successfully",
  PROFILE_CREATED: "Profile created successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  PROFILE_DELETED: "Profile deleted successfully",
  MISSION_CREATED: "Mission created successfully",
  MISSION_UPDATED: "Mission updated successfully",
  MISSION_DELETED: "Mission deleted successfully",
  MISSION_STATUS_UPDATED: "Mission status updated successfully",
  MISSION_OBJECTIVES_UPDATED: "Mission objectives updated successfully",
  FAILURE_RECORD_ADDED: "Failure record added successfully",
  AGENT_REGISTERED: "Agent registered successfully",
  AGENT_UPDATED: "Agent updated successfully",
  AGENT_STATE_UPDATED: "Agent state updated successfully",
  AGENTS_LISTED: "Agents listed successfully",
  AGENTS_BY_CAPABILITY_LISTED: "Agents by capability listed successfully",
} as const;

export type SuccessMessage = (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];
