/**
 * Role Management Types
 * Contains types for managing user roles and role-based access control
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Role Management Requests
 */
export interface AssignRoleRequest {
  fingerprintId: string;
  role: string;
}

export interface UpdateTagsRequest {
  fingerprintId: string;
  tags: Record<string, any>;
}

export interface UpdateRolesByTagsRequest {
  fingerprintId: string;
  tagRules: Record<string, string>;
}

/**
 * Role Database Documents
 */
export interface RoleAssignment {
  fingerprintId: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedBy?: string;
}

export interface RoleTagRule {
  tagPattern: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  priority: number;
}

/**
 * Role Management Endpoints
 */
export const ROLE_ENDPOINTS = {
  ASSIGN_ROLE: "/role/assign",
  UPDATE_TAGS: "/role/tags/update",
  UPDATE_ROLES_BY_TAGS: "/role/tags/rules/update",
} as const;
