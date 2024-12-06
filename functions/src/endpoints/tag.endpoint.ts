import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ROLES } from "../constants";

interface TagValue {
  [key: string]: number;
}

interface TagRule {
  min: number;
  role: string;
}

interface TagRules {
  [tag: string]: TagRule;
}

// Helper to check if a role is valid
const isValidRole = (role: string): boolean => {
  return Object.values(ROLES).includes(role as (typeof ROLES)[keyof typeof ROLES]);
};

export const addOrUpdateTags = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, tags } = req.body as { fingerprintId: string; tags: TagValue };

    // Check fields one by one for better error messages
    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!tags) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: tags",
      });
    }

    // Validate tag values
    for (const [key, value] of Object.entries(tags)) {
      if (typeof value !== "number") {
        return res.status(400).json({
          success: false,
          error: `Invalid value for tag '${key}': must be a number`,
        });
      }
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const currentTags = doc.data()?.tags || {};
    const updatedTags = {
      ...currentTags,
      ...tags,
    };

    await fingerprintRef.update({
      tags: updatedTags,
    });

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        tags: updatedTags,
      },
    });
  } catch (error: any) {
    console.error("Error in update tags:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update tags",
    });
  }
};

export const updateRolesBasedOnTags = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, tagRules } = req.body as { fingerprintId: string; tagRules: TagRules };

    // Check fields one by one for better error messages
    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!tagRules) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: tagRules",
      });
    }

    // Validate tag rule format
    for (const [tag, rule] of Object.entries(tagRules)) {
      if (!rule || typeof rule !== "object") {
        return res.status(400).json({
          success: false,
          error: `Invalid rule format for tag '${tag}'`,
        });
      }

      if (typeof rule.min !== "number") {
        return res.status(400).json({
          success: false,
          error: `Invalid min value for tag '${tag}': must be a number`,
        });
      }

      if (typeof rule.role !== "string") {
        return res.status(400).json({
          success: false,
          error: `Invalid role value for tag '${tag}': must be a string`,
        });
      }

      // Validate role name
      if (!isValidRole(rule.role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role: ${rule.role}`,
        });
      }
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const data = doc.data();
    const currentTags = data?.tags || {};
    const currentRoles = new Set(data?.roles || ["user"]);

    // Apply tag rules
    Object.entries(tagRules).forEach(([tag, rule]) => {
      const tagValue = currentTags[tag] || 0;
      if (tagValue >= rule.min) {
        currentRoles.add(rule.role);
      }
    });

    const updatedRoles = Array.from(currentRoles);
    await fingerprintRef.update({
      roles: updatedRoles,
    });

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        roles: updatedRoles,
      },
    });
  } catch (error: any) {
    console.error("Error in update roles based on tags:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update roles",
    });
  }
};
