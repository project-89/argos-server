import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ROLES } from "../constants";

const AVAILABLE_ROLES = Object.values(ROLES);

export const assign = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, role } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: role",
      });
    }

    if (!AVAILABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role",
      });
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

    const currentRoles = doc.data()?.roles || [];
    const updatedRoles = [...new Set([...currentRoles, role])];

    await fingerprintRef.update({
      roles: updatedRoles,
    });

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        role,
        roles: updatedRoles,
      },
    });
  } catch (error: any) {
    console.error("Error in assign role:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to assign role",
    });
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, role } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: role",
      });
    }

    if (role === ROLES.USER) {
      return res.status(400).json({
        success: false,
        error: "Cannot remove user role",
      });
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

    const currentRoles = doc.data()?.roles || [];
    const updatedRoles = currentRoles.filter((r: string) => r !== role);

    await fingerprintRef.update({
      roles: updatedRoles,
    });

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        role,
        roles: updatedRoles,
      },
    });
  } catch (error: any) {
    console.error("Error in remove role:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to remove role",
    });
  }
};

export const getAvailable = async (_req: Request, res: Response): Promise<Response> => {
  try {
    return res.status(200).json({
      success: true,
      data: AVAILABLE_ROLES,
    });
  } catch (error: any) {
    console.error("Error in get available roles:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get available roles",
    });
  }
};
