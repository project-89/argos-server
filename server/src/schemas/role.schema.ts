import { z } from "zod";

// Account Roles
export const AccountRoleSchema = z.enum([
  "user", // Base role for all accounts
  "agent_creator", // Can create and manage agents
  "admin", // Full system access
]);

// Agent Ranks
export const AgentRankSchema = z.enum([
  "initiate", // New agents
  "field", // Basic verified agents
  "senior", // Experienced agents
  "master", // Expert agents
  "special", // Special clearance agents
]);

// API Permissions
export const PermissionSchema = z.enum([
  "create_agents", // Create new agents
  "manage_agents", // Modify agent settings
  "manage_roles", // Assign roles to accounts
  "view_classified", // Access sensitive data
  "manage_operations", // Manage field operations
  "special_access", // Special system access
]);

// Role Hierarchies
export const AccountRoleHierarchySchema = z.record(AccountRoleSchema, z.number());
export const AgentRankHierarchySchema = z.record(AgentRankSchema, z.number());

// Permission Mappings
export const AccountRolePermissionsSchema = z.record(AccountRoleSchema, z.array(PermissionSchema));
export const AgentRankCapabilitiesSchema = z.record(AgentRankSchema, z.array(z.string()));

// Default Values (constants)
export const DEFAULT_ACCOUNT_ROLE_HIERARCHY = {
  user: 0,
  agent_creator: 1,
  admin: 2,
} as const;

export const DEFAULT_AGENT_RANK_HIERARCHY = {
  initiate: 0,
  field: 1,
  senior: 2,
  master: 3,
  special: 4,
} as const;

export const DEFAULT_ACCOUNT_ROLE_PERMISSIONS = {
  user: [],
  agent_creator: ["create_agents", "manage_agents"],
  admin: [
    "create_agents",
    "manage_agents",
    "manage_roles",
    "view_classified",
    "manage_operations",
    "special_access",
  ],
} as const;

export const DEFAULT_AGENT_RANK_CAPABILITIES = {
  initiate: ["basic_operations"],
  field: ["basic_operations", "field_operations"],
  senior: ["basic_operations", "field_operations", "advanced_operations"],
  master: ["basic_operations", "field_operations", "advanced_operations", "master_operations"],
  special: [
    "basic_operations",
    "field_operations",
    "advanced_operations",
    "master_operations",
    "special_operations",
  ],
} as const;

// Export inferred types
export type AccountRole = z.infer<typeof AccountRoleSchema>;
export type AgentRank = z.infer<typeof AgentRankSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type AccountRoleHierarchy = z.infer<typeof AccountRoleHierarchySchema>;
export type AgentRankHierarchy = z.infer<typeof AgentRankHierarchySchema>;
export type AccountRolePermissions = z.infer<typeof AccountRolePermissionsSchema>;
export type AgentRankCapabilities = z.infer<typeof AgentRankCapabilitiesSchema>;
