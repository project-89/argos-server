import { Request } from "express";
import { AccountRole } from "../schemas/role.schema";

/**
 * Authentication context that is attached to requests after authentication
 */
export interface AuthContext {
  accountId: string;
  fingerprintId?: string;
  walletAddress?: string;
  roles?: AccountRole[];
  isAdmin?: boolean;
}

/**
 * Extended Express Request with authentication context
 */
export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
