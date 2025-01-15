import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ROLE, ROLE_HIERARCHY } from "../constants/roles";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

export interface FingerprintData {
  tags?: string[];
  roles?: ROLE[];
}

/**
 * Check if the caller has sufficient privileges to manage the target role
 */
export const canManageRole = async (
  callerFingerprintId: string,
  targetRole: ROLE,
): Promise<boolean> => {
  const db = getFirestore();
  const callerDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(callerFingerprintId).get();

  if (!callerDoc.exists) {
    return false;
  }

  const callerData = callerDoc.data() as FingerprintData;
  const callerRoles = callerData?.roles || [ROLE.USER];

  // Admin can manage any role
  if (callerRoles.includes(ROLE.ADMIN)) {
    return true;
  }

  // Get the highest role level of the caller
  const callerLevel = Math.max(...callerRoles.map((role) => ROLE_HIERARCHY[role] || 0));
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // Caller must have a higher role level to manage the target role
  return callerLevel > targetLevel;
};

/**
 * Add or update tags for a fingerprint
 */
export const updateTags = async (
  fingerprintId: string,
  newTags: string[],
): Promise<{ fingerprintId: string; tags: string[] }> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const currentTags = new Set<string>(data?.tags || []);

    // Add new tags to the set
    newTags.forEach((tag) => currentTags.add(tag));

    // Convert set back to array
    const updatedTags = Array.from(currentTags);

    await fingerprintRef.update({
      tags: updatedTags,
    });

    return {
      fingerprintId,
      tags: updatedTags,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in updateTags:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update roles based on tag rules
 */
export const updateRolesByTags = async (
  fingerprintId: string,
  callerFingerprintId: string,
  tagRules: Record<string, { tags: string[]; role: ROLE }>,
): Promise<{ fingerprintId: string; roles: ROLE[] }> => {
  try {
    // Prevent self-role modification
    if (fingerprintId === callerFingerprintId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if caller has sufficient privileges for all roles in the rules
    for (const [_, rule] of Object.entries(tagRules)) {
      const hasPermission = await canManageRole(callerFingerprintId, rule.role);
      if (!hasPermission) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }
    }

    // Get fingerprint document
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const currentTags = new Set<string>(data?.tags || []);
    const currentRoles = new Set<ROLE>(data?.roles || [ROLE.USER]);

    // Always ensure user role is present
    currentRoles.add(ROLE.USER);

    // Add new roles based on tag rules
    for (const [_, rule] of Object.entries(tagRules)) {
      // Check if fingerprint has all required tags
      if (rule.tags.every((tag) => currentTags.has(tag))) {
        currentRoles.add(rule.role);
      }
    }

    // Update fingerprint document
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
    console.error("Error in updateRolesByTags:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get all tags for a fingerprint
 */
export const getTags = async (fingerprintId: string): Promise<string[]> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    return data?.tags || [];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in getTags:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Remove tags from a fingerprint
 */
export const removeTags = async (
  fingerprintId: string,
  tagsToRemove: string[],
): Promise<{ fingerprintId: string; tags: string[] }> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const currentTags = new Set<string>(data?.tags || []);

    // Remove specified tags
    tagsToRemove.forEach((tag) => currentTags.delete(tag));

    // Convert set back to array
    const updatedTags = Array.from(currentTags);

    await fingerprintRef.update({
      tags: updatedTags,
    });

    return {
      fingerprintId,
      tags: updatedTags,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in removeTags:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
