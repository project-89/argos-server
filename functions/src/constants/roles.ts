export enum ROLE {
  USER = "user",
  AGENT_INITIATE = "agent-initiate",
  AGENT_FIELD = "agent-field",
  AGENT_SENIOR = "agent-senior",
  AGENT_MASTER = "agent-master",
  ADMIN = "admin",
}

export type Permission = "admin" | "manage_roles" | "manage_tags";

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
  [ROLE.AGENT_FIELD]: ["manage_tags"],
  [ROLE.AGENT_SENIOR]: ["manage_tags", "manage_roles"],
  [ROLE.AGENT_MASTER]: ["manage_tags", "manage_roles"],
  [ROLE.ADMIN]: ["admin", "manage_roles", "manage_tags"],
};
