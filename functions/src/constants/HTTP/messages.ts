export const SUCCESS_MESSAGES = {
  IMPRESSION_CREATED: "Impression created successfully",
  IMPRESSIONS_RETRIEVED: "Impressions retrieved successfully",
  IMPRESSIONS_DELETED: "Impressions deleted successfully",
  PROFILE_CREATED: "Profile created successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  PROFILE_DELETED: "Profile deleted successfully",
} as const;

export type SuccessMessage = (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];
