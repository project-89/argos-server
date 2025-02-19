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

class RoleService {
  private db = getFirestore();

  /**
   * Core role checking logic
   */
  async getUserRoles(fingerprintId: string): Promise<ROLE[]> {
    const doc = await this.db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!doc.exists) {
      return [ROLE.USER];
    }

    const data = doc.data() as { roles?: ROLE[] };
    return data?.roles || [ROLE.USER];
  }

  /**
   * All role-based checks
   */
  async isAdmin(fingerprintId: string): Promise<boolean> {
    const roles = await this.getUserRoles(fingerprintId);
    return roles.includes(ROLE.ADMIN);
  }

  async hasPermission(fingerprintId: string, permission: Permission): Promise<boolean> {
    const roles = await this.getUserRoles(fingerprintId);

    // Admin has all permissions
    if (roles.includes(ROLE.ADMIN)) {
      return true;
    }

    return roles.some((role) => {
      const permissions = ROLE_PERMISSIONS[role];
      return Array.isArray(permissions) && permissions.includes(permission);
    });
  }

  async canManageRole(callerFingerprintId: string, targetRole: ROLE): Promise<boolean> {
    const roles = await this.getUserRoles(callerFingerprintId);

    if (roles.includes(ROLE.ADMIN)) {
      return true;
    }

    const callerLevel = Math.max(...roles.map((role) => ROLE_HIERARCHY[role] || 0));
    const targetLevel = ROLE_HIERARCHY[targetRole];

    return callerLevel > targetLevel;
  }

  /**
   * Role modification methods
   */
  async assignRole(
    fingerprintId: string,
    callerFingerprintId: string,
    role: ROLE,
  ): Promise<{ fingerprintId: string; roles: ROLE[] }> {
    try {
      // Only prevent self-role modification for non-admins
      if (fingerprintId === callerFingerprintId && !(await this.isAdmin(callerFingerprintId))) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      // Check if caller has sufficient privileges
      const hasPermission = await this.canManageRole(callerFingerprintId, role);
      if (!hasPermission) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      const fingerprintRef = this.db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
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
  }

  async removeRole(
    fingerprintId: string,
    callerFingerprintId: string,
    role: ROLE,
  ): Promise<{ fingerprintId: string; roles: ROLE[] }> {
    try {
      if (role === ROLE.USER) {
        throw new ApiError(400, ERROR_MESSAGES.CANNOT_REMOVE_USER_ROLE);
      }

      // Only prevent self-role modification for non-admins
      if (fingerprintId === callerFingerprintId && !(await this.isAdmin(callerFingerprintId))) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      // Check if caller has sufficient privileges
      const hasPermission = await this.canManageRole(callerFingerprintId, role);
      if (!hasPermission) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      const fingerprintRef = this.db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
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
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): ROLE[] {
    return [...Object.values(ROLE)];
  }
}

export const roleService = new RoleService();
