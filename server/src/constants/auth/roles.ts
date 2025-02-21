import {
  AccountRoleSchema,
  AgentRankSchema,
  PermissionSchema,
  DEFAULT_ACCOUNT_ROLE_HIERARCHY,
  DEFAULT_AGENT_RANK_HIERARCHY,
  DEFAULT_ACCOUNT_ROLE_PERMISSIONS,
  DEFAULT_AGENT_RANK_CAPABILITIES,
  type AccountRole,
  type AgentRank,
  type Permission,
} from "../../schemas/role.schema";

// Export the enums from the schemas
export const ACCOUNT_ROLE = AccountRoleSchema.enum;
export const AGENT_RANK = AgentRankSchema.enum;
export const PERMISSION = PermissionSchema.enum;

// Export the hierarchies and mappings
export const ACCOUNT_ROLE_HIERARCHY = DEFAULT_ACCOUNT_ROLE_HIERARCHY;
export const AGENT_RANK_HIERARCHY = DEFAULT_AGENT_RANK_HIERARCHY;
export const ACCOUNT_ROLE_PERMISSIONS = DEFAULT_ACCOUNT_ROLE_PERMISSIONS;
export const AGENT_RANK_CAPABILITIES = DEFAULT_AGENT_RANK_CAPABILITIES;

// Export types
export type { AccountRole, AgentRank, Permission };
