import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

/**
 * Middleware to validate JWT token and set accountId and walletAddress on request
 */
export const validateAuthToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, ERROR_MESSAGES.TOKEN_REQUIRED);
    }

    const token = authHeader.split(" ")[1];
    const auth = getAuth();

    try {
      const decodedToken = await auth.verifyIdToken(token);

      // Extract account info from token claims
      const { accountId, walletAddress } = decodedToken;
      if (!accountId || !walletAddress) {
        throw new ApiError(401, ERROR_MESSAGES.INVALID_TOKEN_FORMAT);
      }

      // Set account info on request for ownership checks
      req.auth = {
        ...req.auth!,
        account: {
          id: accountId as string,
        },
      };

      next();
    } catch (error) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_TOKEN);
    }
  } catch (error) {
    next(error);
  }
};
