import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { getFirestore } from "firebase-admin/firestore";
import { Account } from "../schemas";

const LOG_PREFIX = "[Ownership Check]";

/**
 * Middleware to verify account ownership of resources
 * Requires auth middleware to be run first to set req.accountId
 * Used for both read and write operations on account-owned resources
 *
 * This middleware verifies:
 * 1. Account exists and is authenticated
 * 2. For profile/account operations - the accountId matches the authenticated user
 * 3. For fingerprint-based resources:
 *    - If the resource is associated with a fingerprintId (in params, body, or query)
 *    - Verifies that fingerprint belongs to the authenticated account
 *    - This allows access to ALL resources associated with owned fingerprints
 *
 * Admin users bypass all ownership checks
 */
export const verifyAccountOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      console.log(`${LOG_PREFIX} Skipping OPTIONS request`);
      return next();
    }

    const { account } = req.auth!;
    if (!account) {
      throw new ApiError(401, ERROR_MESSAGES.TOKEN_REQUIRED);
    }

    // Get the target resource IDs
    const targetAccountId = req.params.accountId || req.body.accountId;
    const targetFingerprintId =
      req.params.fingerprintId || req.body.fingerprintId || req.query.fingerprintId;

    console.log(`${LOG_PREFIX} Checking ownership:`, {
      method: req.method,
      path: req.path,
      account,
      targetAccountId,
      targetFingerprintId,
    });

    // Get the account document
    const db = getFirestore();
    const accountDoc = await db.collection(COLLECTIONS.ACCOUNTS).doc(account.id).get();

    if (!accountDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    const accountData = accountDoc.data() as Account;

    // Case 1: Account/Profile operations
    if (targetAccountId) {
      // For account operations, verify the authenticated user matches the target account
      if (targetAccountId !== account.id) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }
      return next();
    }

    // Case 2: Fingerprint-based resource operations
    if (targetFingerprintId) {
      // Verify fingerprint exists and is linked to account
      if (accountData?.fingerprintId !== targetFingerprintId) {
        console.log(`${LOG_PREFIX} Fingerprint not linked to account`, {
          account,
          targetFingerprintId,
        });
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      // If fingerprint is owned, allow access to ALL resources associated with this fingerprint
      // This includes the fingerprint itself and any other resources using fingerprintId as identifier
      return next();
    }

    // Case 3: Other resources
    // By default, if no specific resource ID is provided, we assume the operation
    // is allowed as the auth middleware has already verified the user
    next();
  } catch (error) {
    next(error);
  }
};
