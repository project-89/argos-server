export const COLLECTIONS = {
  FINGERPRINTS: "fingerprints",
  API_KEYS: "api-keys",
  VISITS: "visits",
  PRESENCE: "presence",
  RATE_LIMITS: "rate-limits",
  RATE_LIMIT_STATS: "rate-limit-stats",
  TAG_RULES: "tag-rules",
  TAG_STATS: "tag-stats",
  TAG_EVENTS: "tag-events",
  TAG_EVENT_VISITS: "tag-event-visits",
  PRICE_CACHE: "price-cache",
  SITES: "sites",
  IMPRESSIONS: "impressions",
  PROFILES: "profiles",
  CAPABILITIES: "capabilities",
  STATS: "stats",
  STATS_HISTORY: "stats-history",
  ROLES: "roles",
  TAGS: "tags",
  SKILLS: "skills",
  PROFILE_CAPABILITIES: "profile-capabilities",
  ACCOUNTS: "accounts",
  ANON_USERS: "anon-users",
  MISSIONS: "missions",
  ONBOARDING: "onboarding",
  AGENTS: "agents",
} as const;

export type Collection = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
