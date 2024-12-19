import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";

export const updatePresence = [
  validateRequest(
    z.object({
      fingerprintId: z
        .string({
          required_error: "Fingerprint ID is required",
        })
        .min(1, "Fingerprint ID cannot be empty"),
      status: z.enum(["online", "offline"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be either 'online' or 'offline'",
      }),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, status } = req.body;

      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
      }

      await fingerprintRef.update({
        presence: {
          status,
          lastUpdated: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          fingerprintId,
          status,
        },
      });
    } catch (error) {
      console.error("Error updating presence:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];
