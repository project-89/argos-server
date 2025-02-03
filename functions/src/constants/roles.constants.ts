export enum ROLE {
  USER = "user",
  AGENT_INITIATE = "agent-initiate",
  AGENT_FIELD = "agent-field",
  AGENT_SENIOR = "agent-senior",
  AGENT_MASTER = "agent-master",
  ADMIN = "admin",
}

export type Permission =
  | "admin"
  | "manage_roles"
  | "view_classified" // Access to sensitive data
  | "manage_operations" // Can manage field operations
  | "oversee_agents" // Can monitor and guide other agents
  | "special_access"; // Special clearance for certain operations

export const ROLE_HIERARCHY: Record<ROLE, number> = {
  [ROLE.USER]: 0,
  [ROLE.AGENT_INITIATE]: 1,
  [ROLE.AGENT_FIELD]: 2,
  [ROLE.AGENT_SENIOR]: 3,
  [ROLE.AGENT_MASTER]: 4,
  [ROLE.ADMIN]: 5,
};

export const ROLE_PERMISSIONS: Record<ROLE, Permission[]> = {
  [ROLE.USER]: [],
  [ROLE.AGENT_INITIATE]: [],
  [ROLE.AGENT_FIELD]: ["view_classified"],
  [ROLE.AGENT_SENIOR]: ["view_classified", "manage_operations", "oversee_agents"],
  [ROLE.AGENT_MASTER]: ["view_classified", "manage_operations", "oversee_agents", "special_access"],
  [ROLE.ADMIN]: [
    "admin",
    "manage_roles",
    "view_classified",
    "manage_operations",
    "oversee_agents",
    "special_access",
  ],
};
