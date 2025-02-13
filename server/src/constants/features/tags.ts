export const ALLOWED_TAG_TYPES = {
  IT: "it",
} as const;

export type TagType = (typeof ALLOWED_TAG_TYPES)[keyof typeof ALLOWED_TAG_TYPES];

export const TAG_LIMITS = {
  DAILY_TAGS: 3,
} as const;
