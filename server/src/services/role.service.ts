import {
  COLLECTIONS,
  ERROR_MESSAGES,
  ACCOUNT_ROLE,
  ACCOUNT_ROLE_HIERARCHY,
  ACCOUNT_ROLE_PERMISSIONS,
  Permission,
} from "../constants";
import { ApiError } from "../utils";
import { getDb, toObjectId } from "../utils/mongodb";
import { getAccountById } from "./account.service";

const LOG_PREFIX = "[Role Service]";
type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];

/**
 * Core role checking logic
 */
export const getAccountRoles = async (accountId: string): Promise<AccountRole[]> => {
  const account = await getAccountById(accountId);
  if (!account) {
    return [ACCOUNT_ROLE.user];
  }

  return account.roles || [ACCOUNT_ROLE.user];
};

export const getAvailableRoles = (): AccountRole[] => {
  return Object.values(ACCOUNT_ROLE);
};

/**
 * All role-based checks
 */
export const hasPermission = async (
  accountId: string,
  permission: Permission,
): Promise<boolean> => {
  const roles = await getAccountRoles(accountId);

  return roles.some((role) => {
    const permissions = ACCOUNT_ROLE_PERMISSIONS[role];
    return Array.isArray(permissions) && permissions.includes(permission);
  });
};

export const canManageRole = async (
  callerAccountId: string,
  targetRole: AccountRole,
): Promise<boolean> => {
  const roles = await getAccountRoles(callerAccountId);

  const callerLevel = Math.max(...roles.map((role) => ACCOUNT_ROLE_HIERARCHY[role] || 0));
  const targetLevel = ACCOUNT_ROLE_HIERARCHY[targetRole];

  return callerLevel > targetLevel;
};

/**
 * Role modification methods
 */
export const assignRole = async (
  targetAccountId: string,
  callerAccountId: string,
  role: AccountRole,
): Promise<{ accountId: string; roles: AccountRole[] }> => {
  try {
    // Only prevent self-role modification for non-admins
    if (targetAccountId === callerAccountId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerAccountId, role);
    if (!hasPermission) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const account = await getAccountById(targetAccountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    const currentRoles = new Set<AccountRole>(account.roles || [ACCOUNT_ROLE.user]);
    currentRoles.add(role);
    currentRoles.add(ACCOUNT_ROLE.user); // Ensure user role is always present

    const updatedRoles = Array.from(currentRoles);

    const db = await getDb();
    await db
      .collection(COLLECTIONS.ACCOUNTS)
      .updateOne({ _id: toObjectId(targetAccountId) }, { $set: { roles: updatedRoles } });

    return {
      accountId: targetAccountId,
      roles: updatedRoles,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error(`${LOG_PREFIX} Error in assignRole:`, error);
    throw new ApiError(500, ERROR_MESSAGES.FAILED_ASSIGN_ROLE);
  }
};

export const removeRole = async (
  targetAccountId: string,
  callerAccountId: string,
  role: AccountRole,
): Promise<{ accountId: string; roles: AccountRole[] }> => {
  try {
    if (role === ACCOUNT_ROLE.user) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_REMOVE_USER_ROLE);
    }

    // Only prevent self-role modification for non-admins
    if (targetAccountId === callerAccountId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerAccountId, role);
    if (!hasPermission) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const account = await getAccountById(targetAccountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    const currentRoles = new Set<AccountRole>(account.roles || [ACCOUNT_ROLE.user]);
    currentRoles.delete(role);
    currentRoles.add(ACCOUNT_ROLE.user); // Ensure user role is always present

    const updatedRoles = Array.from(currentRoles);

    const db = await getDb();
    await db
      .collection(COLLECTIONS.ACCOUNTS)
      .updateOne({ _id: toObjectId(targetAccountId) }, { $set: { roles: updatedRoles } });

    return {
      accountId: targetAccountId,
      roles: updatedRoles,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error(`${LOG_PREFIX} Error in removeRole:`, error);
    throw new ApiError(500, ERROR_MESSAGES.FAILED_REMOVE_ROLE);
  }
};
