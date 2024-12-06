export const PREDEFINED_ROLES = [
  "user",
  "agent-initiate",
  "agent-field",
  "agent-senior",
  "agent-master",
] as const;

export type PredefinedRole = (typeof PREDEFINED_ROLES)[number];

export const ROLE_HIERARCHY: Record<PredefinedRole, number> = {
  user: 0,
  "agent-initiate": 1,
  "agent-field": 2,
  "agent-senior": 3,
  "agent-master": 4,
};

export const DEFAULT_ROLE: PredefinedRole = "user";

export const ROLE_PERMISSIONS = {
  user: ["read:basic"],
  "agent-initiate": ["read:basic", "write:basic"],
  "agent-field": ["read:basic", "write:basic", "read:advanced"],
  "agent-senior": ["read:basic", "write:basic", "read:advanced", "write:advanced"],
  "agent-master": ["read:basic", "write:basic", "read:advanced", "write:advanced", "admin"],
} as const;
