import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES, PredefinedRole } from "../constants/roles";

interface TagRule {
  min: number;
  role: PredefinedRole;
}

type TagRules = Record<string, TagRule>;

export const addOrUpdateTags = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, tags } = req.body;

    // Validate required fields
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

    // Get fingerprint document
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    // Check if fingerprint exists
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    // Merge with existing tags
    const existingTags = fingerprintDoc.data()?.tags || {};
    const updatedTags = { ...existingTags, ...tags };

    // Update fingerprint document
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
  } catch (error) {
    console.error("Error updating tags:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateRolesBasedOnTags = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, tagRules } = req.body as { fingerprintId: string; tagRules: TagRules };

    // Validate required fields
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
      if (typeof rule.min !== "number") {
        return res.status(400).json({
          success: false,
          error: `Invalid min value for tag '${tag}': must be a number`,
        });
      }

      if (!PREDEFINED_ROLES.includes(rule.role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role: ${rule.role}`,
        });
      }
    }

    // Get fingerprint document
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    // Check if fingerprint exists
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const data = fingerprintDoc.data();
    const currentTags = data?.tags || {};
    const currentRoles = new Set(data?.roles || ["user"]);

    // Always ensure user role is present
    currentRoles.add("user");

    // First preserve existing roles
    if (data?.roles) {
      for (const role of data.roles) {
        currentRoles.add(role);
      }
    }

    // Then add new roles based on tag rules
    for (const [tag, rule] of Object.entries(tagRules)) {
      const tagValue = currentTags[tag] || 0;
      if (tagValue >= rule.min) {
        currentRoles.add(rule.role);
      }
    }

    // Update fingerprint document
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
  } catch (error) {
    console.error("Error updating roles based on tags:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
