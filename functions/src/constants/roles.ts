export const PREDEFINED_ROLES = [
  "user",
  "agent-initiate",
  "agent-field",
  "agent-senior",
  "agent-master",
  "admin",
] as const;

export type PredefinedRole = (typeof PREDEFINED_ROLES)[number];

export const ROLE_HIERARCHY: Record<PredefinedRole, number> = {
  user: 0,
  "agent-initiate": 1,
  "agent-field": 2,
  "agent-senior": 3,
  "agent-master": 4,
  admin: 5,
};

export const DEFAULT_ROLE: PredefinedRole = "user";

export const PERMISSIONS = [
  "read:basic",
  "write:basic",
  "read:advanced",
  "write:advanced",
  "admin",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<PredefinedRole, readonly Permission[]> = {
  user: ["read:basic"],
  "agent-initiate": ["read:basic", "write:basic"],
  "agent-field": ["read:basic", "write:basic", "read:advanced"],
  "agent-senior": ["read:basic", "write:basic", "read:advanced", "write:advanced"],
  "agent-master": ["read:basic", "write:basic", "read:advanced", "write:advanced", "admin"],
  admin: ["read:basic", "write:basic", "read:advanced", "write:advanced", "admin"],
} as const;
