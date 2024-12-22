import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { generateApiKey, encryptApiKey } from "../utils/api-key";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import { validateApiKey, revokeApiKey } from "../services/apiKeyService";
import { sendSuccess, sendError } from "../utils/response";

export const register = [
  validateRequest(schemas.apiKeyRegister),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId } = req.body;

      // Verify fingerprint exists
      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        return sendError(res, "Fingerprint not found", 404);
      }

      // Check if fingerprint already has an API key
      const existingKeySnapshot = await db
        .collection(COLLECTIONS.API_KEYS)
        .where("fingerprintId", "==", fingerprintId)
        .where("enabled", "==", true)
        .get();

      // Generate new API key
      const plainApiKey = generateApiKey();
      const encryptedApiKey = encryptApiKey(plainApiKey);

      // Save encrypted API key (server-side)
      const apiKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
      await apiKeyRef.set({
        key: encryptedApiKey,
        fingerprintId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiration
        enabled: true,
        metadata: {
          name: "Generated API Key",
        },
      });

      // If there was an existing key, disable it
      if (!existingKeySnapshot.empty) {
        const batch = db.batch();
        existingKeySnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { enabled: false });
        });
        await batch.commit();
      }

      return sendSuccess(res, {
        key: encryptedApiKey,
        fingerprintId,
      });
    } catch (error) {
      console.error("Error in register API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to register API key");
    }
  },
];

export const validate = [
  validateRequest(schemas.apiKeyValidate),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key } = req.body;
      const result = await validateApiKey(key);

      return sendSuccess(res, {
        isValid: result.isValid,
        needsRefresh: result.needsRefresh,
      });
    } catch (error) {
      console.error("Error in validate API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to validate API key");
    }
  },
];

export const revoke = [
  validateRequest(schemas.apiKeyRevoke),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key } = req.body;
      const fingerprintId = req.fingerprintId;

      if (!fingerprintId) {
        return sendError(res, "Authentication required", 401);
      }

      await revokeApiKey(key, fingerprintId);
      return sendSuccess(res, { message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error in revoke API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to revoke API key");
    }
  },
];
