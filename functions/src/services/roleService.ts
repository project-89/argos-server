import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES, ROLE_HIERARCHY, PredefinedRole } from "../constants/roles";
import { ApiError } from "../utils/error";

export interface RoleData {
  roles?: PredefinedRole[];
}

/**
 * Check if the caller has sufficient privileges to manage the target role
 */
export const canManageRole = async (
  callerFingerprintId: string,
  targetRole: PredefinedRole,
): Promise<boolean> => {
  const db = getFirestore();
  const callerDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(callerFingerprintId).get();

  if (!callerDoc.exists) {
    return false;
  }

  const callerData = callerDoc.data() as RoleData;
  const callerRoles = callerData?.roles || [PREDEFINED_ROLES[0]];

  // Admin can manage any role
  if (callerRoles.includes(PREDEFINED_ROLES[PREDEFINED_ROLES.length - 1])) {
    return true;
  }

  // Get the highest role level of the caller
  const callerLevel = Math.max(...callerRoles.map((role) => ROLE_HIERARCHY[role] || 0));
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // Caller must have a higher role level to manage the target role
  return callerLevel > targetLevel;
};

/**
 * Check if a user has admin privileges
 */
export const isAdmin = async (fingerprintId: string): Promise<boolean> => {
  const db = getFirestore();
  const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

  if (!doc.exists) {
    return false;
  }

  const data = doc.data() as RoleData;
  return data?.roles?.includes(PREDEFINED_ROLES[PREDEFINED_ROLES.length - 1]) || false;
};

/**
 * Assign a role to a fingerprint
 */
export const assignRole = async (
  fingerprintId: string,
  callerFingerprintId: string,
  role: PredefinedRole,
): Promise<{ fingerprintId: string; roles: PredefinedRole[] }> => {
  try {
    // Only prevent self-role modification for non-admins
    if (fingerprintId === callerFingerprintId && !(await isAdmin(callerFingerprintId))) {
      throw new ApiError(403, "Cannot modify your own roles");
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerFingerprintId, role);
    if (!hasPermission) {
      throw new ApiError(403, "Insufficient privileges to assign this role");
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    const data = fingerprintDoc.data() as RoleData;
    const currentRoles = new Set<PredefinedRole>(data?.roles || [PREDEFINED_ROLES[0]]);
    currentRoles.add(role);
    currentRoles.add(PREDEFINED_ROLES[0]); // Ensure user role is always present

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
    throw new ApiError(500, "Failed to assign role");
  }
};

/**
 * Remove a role from a fingerprint
 */
export const removeRole = async (
  fingerprintId: string,
  callerFingerprintId: string,
  role: PredefinedRole,
): Promise<{ fingerprintId: string; roles: PredefinedRole[] }> => {
  try {
    if (role === PREDEFINED_ROLES[0]) {
      throw new ApiError(400, "Cannot remove user role");
    }

    // Only prevent self-role modification for non-admins
    if (fingerprintId === callerFingerprintId && !(await isAdmin(callerFingerprintId))) {
      throw new ApiError(403, "Cannot modify your own roles");
    }

    // Check if caller has sufficient privileges
    const hasPermission = await canManageRole(callerFingerprintId, role);
    if (!hasPermission) {
      throw new ApiError(403, "Insufficient privileges to remove this role");
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    const data = fingerprintDoc.data() as RoleData;
    const currentRoles = new Set<PredefinedRole>(data?.roles || [PREDEFINED_ROLES[0]]);
    currentRoles.delete(role);
    currentRoles.add(PREDEFINED_ROLES[0]); // Ensure user role is always present

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
    throw new ApiError(500, "Failed to remove role");
  }
};

/**
 * Get all available roles
 */
export const getAvailableRoles = (): PredefinedRole[] => {
  return [...PREDEFINED_ROLES];
};
