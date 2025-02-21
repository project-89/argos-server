import { getFirestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  ERROR_MESSAGES,
  ROLE,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  Permission,
} from "../constants";
import { ApiError } from "../utils";

/**
 * Core role checking logic
 */
export const getUserRoles = async (fingerprintId: string): Promise<ROLE[]> => {
  const doc = await getFirestore().collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

  if (!doc.exists) {
    return [ROLE.USER];
  }

  const data = doc.data() as { roles?: ROLE[] };
  return data?.roles || [ROLE.USER];
};

export const getAvailableRoles = (): ROLE[] => {
  return [...Object.values(ROLE)];
};

/**
 * All role-based checks
 */

export const hasPermission = async (
  fingerprintId: string,
  permission: Permission,
): Promise<boolean> => {
  const roles = await getUserRoles(fingerprintId);

  return roles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role];
    return Array.isArray(permissions) && permissions.includes(permission);
  });
};

export const canManageRole = async (
  callerFingerprintId: string,
  targetRole: ROLE,
): Promise<boolean> => {
  const roles = await getUserRoles(callerFingerprintId);

  const callerLevel = Math.max(...roles.map((role) => ROLE_HIERARCHY[role] || 0));
  const targetLevel = ROLE_HIERARCHY[targetRole];

  return callerLevel > targetLevel;
};

/**
 * Role modification methods
 */
export const assignRole = async (
  fingerprintId: string,
  callerFingerprintId: string,
  role: ROLE,
): Promise<{ fingerprintId: string; roles: ROLE[] }> => {
  try {
    // Only prevent self-role modification for non-admins
    if (fingerprintId === callerFingerprintId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerFingerprintId, role);
    if (!hasPermission) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const fingerprintRef = getFirestore().collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as { roles?: ROLE[] };
    const currentRoles = new Set<ROLE>(data?.roles || [ROLE.USER]);
    currentRoles.add(role);
    currentRoles.add(ROLE.USER); // Ensure user role is always present

    const updatedRoles = Array.from(currentRoles);
    await fingerprintRef.update({
      roles: updatedRoles,
    });

    return {
      fingerprintId,
      roles: updatedRoles,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in assignRole:", error);
    throw new ApiError(500, ERROR_MESSAGES.FAILED_ASSIGN_ROLE);
  }
};

export const removeRole = async (
  fingerprintId: string,
  callerFingerprintId: string,
  role: ROLE,
): Promise<{ fingerprintId: string; roles: ROLE[] }> => {
  try {
    if (role === ROLE.USER) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_REMOVE_USER_ROLE);
    }

    // Only prevent self-role modification for non-admins
    if (fingerprintId === callerFingerprintId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerFingerprintId, role);
    if (!hasPermission) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const fingerprintRef = getFirestore().collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as { roles?: ROLE[] };
    const currentRoles = new Set<ROLE>(data?.roles || [ROLE.USER]);
    currentRoles.delete(role);
    currentRoles.add(ROLE.USER); // Ensure user role is always present

    const updatedRoles = Array.from(currentRoles);
    await fingerprintRef.update({
      roles: updatedRoles,
    });

    return {
      fingerprintId,
      roles: updatedRoles,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in removeRole:", error);
    throw new ApiError(500, ERROR_MESSAGES.FAILED_REMOVE_ROLE);
  }
};
