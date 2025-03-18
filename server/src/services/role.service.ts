import {
  ACCOUNT_ROLE,
  ACCOUNT_ROLE_HIERARCHY,
  ACCOUNT_ROLE_PERMISSIONS,
  COLLECTIONS,
  ERROR_MESSAGES,
  PERMISSION,
} from "../constants";
import { ApiError, idFilter } from "../utils";
import { getAccountById } from "./account.service";
import { getDb, formatDocument } from "../utils/mongodb";

const LOG_PREFIX = "[Role Service]";

// Use the imported types from constants
type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];
type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * Get all roles assigned to an account
 */
export const getAccountRoles = async (accountId: string): Promise<AccountRole[]> => {
  try {
    console.log(`${LOG_PREFIX} Getting roles for account:`, accountId);
    const db = await getDb();

    // Get account and extract roles
    const filter = idFilter(accountId);
    if (!filter) {
      console.warn(`${LOG_PREFIX} Invalid account ID: ${accountId}`);
      return [];
    }

    const account = await db.collection(COLLECTIONS.ACCOUNTS).findOne(filter);
    if (!account) {
      return [];
    }

    // Explicitly type the formatted document
    const formattedAccount = formatDocument<{ roles?: AccountRole[] }>(account);
    return formattedAccount?.roles || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting account roles:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get all available account roles
 */
export const getAvailableRoles = (): AccountRole[] => {
  return Object.values(ACCOUNT_ROLE);
};

/**
 * Check if account has a specific permission
 */
export const hasPermission = async (
  accountId: string,
  permission: Permission,
): Promise<boolean> => {
  const roles = await getAccountRoles(accountId);

  for (const role of roles) {
    // Get permissions for this role and cast to any to bypass TypeScript constraint
    const rolePermissions = (ACCOUNT_ROLE_PERMISSIONS as any)[role] || [];
    if (rolePermissions.includes(permission)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if account can manage a specific role
 */
export const canManageRole = async (
  callerAccountId: string,
  targetRole: AccountRole,
): Promise<boolean> => {
  try {
    // Get caller's roles
    const callerRoles = await getAccountRoles(callerAccountId);

    // Admin can manage all roles
    if (callerRoles.includes(ACCOUNT_ROLE.admin)) {
      return true;
    }

    // Otherwise, check if caller's highest role is above target role
    let callerHighestRank = -1;
    for (const role of callerRoles) {
      const roleRank = ACCOUNT_ROLE_HIERARCHY[role] || 0;
      callerHighestRank = Math.max(callerHighestRank, roleRank);
    }

    const targetRoleRank = ACCOUNT_ROLE_HIERARCHY[targetRole] || 0;
    return callerHighestRank > targetRoleRank;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error checking role management permissions:`, error);
    return false;
  }
};

/**
 * Assign a role to an account
 */
export const assignRole = async (
  targetAccountId: string,
  callerAccountId: string,
  role: AccountRole,
): Promise<{ accountId: string; roles: AccountRole[] }> => {
  try {
    console.log(`${LOG_PREFIX} Adding role to account:`, { targetAccountId, role });

    // Check if caller can manage this role
    const canManage = await canManageRole(callerAccountId, role);
    if (!canManage) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const db = await getDb();

    // Get target account
    const targetAccount = await getAccountById(targetAccountId);
    if (!targetAccount) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Check if role already assigned
    if (targetAccount.roles.includes(role)) {
      return { accountId: targetAccountId, roles: targetAccount.roles };
    }

    // Create new roles array with unique values
    const updatedRoles = [...new Set([...targetAccount.roles, role])];

    // Update account with new roles
    const filter = idFilter(targetAccountId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    await db.collection(COLLECTIONS.ACCOUNTS).updateOne(filter, {
      $set: {
        roles: updatedRoles,
        updatedAt: new Date(),
      },
    });

    return { accountId: targetAccountId, roles: updatedRoles };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error adding role:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Remove a role from an account
 */
export const removeRole = async (
  targetAccountId: string,
  callerAccountId: string,
  role: AccountRole,
): Promise<{ accountId: string; roles: AccountRole[] }> => {
  try {
    console.log(`${LOG_PREFIX} Removing role from account:`, { targetAccountId, role });

    // Check if caller can manage this role
    const canManage = await canManageRole(callerAccountId, role);
    if (!canManage) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const db = await getDb();

    // Get target account
    const targetAccount = await getAccountById(targetAccountId);
    if (!targetAccount) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Check if role is assigned
    if (!targetAccount.roles.includes(role)) {
      return { accountId: targetAccountId, roles: targetAccount.roles };
    }

    // Check if it's the only role
    if (targetAccount.roles.length === 1 && targetAccount.roles[0] === role) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_REMOVE_USER_ROLE);
    }

    // Create new roles array without the role to remove
    const updatedRoles = targetAccount.roles.filter((r) => r !== role);

    // Update account with new roles
    const filter = idFilter(targetAccountId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    await db.collection(COLLECTIONS.ACCOUNTS).updateOne(filter, {
      $set: {
        roles: updatedRoles,
        updatedAt: new Date(),
      },
    });

    return { accountId: targetAccountId, roles: updatedRoles };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error removing role:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
