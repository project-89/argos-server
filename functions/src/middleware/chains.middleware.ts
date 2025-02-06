import { RequestHandler } from "express";
import { validateAuthToken } from "./auth.middleware";
import { verifyAccountOwnership } from "./ownershipCheck.middleware";
import { ZodSchema } from "zod";
import { validateRequest } from "./validation.middleware";
import { verifyFingerprintExists } from "./fingerprintVerify.middleware";
import { verifyAdminRole } from "./verifyAdmin.middleware";

/**
 * Middleware chain factory functions for different endpoint types
 */

// For endpoints that need no authentication (public write operations)
export const publicEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [];
  if (schema) chain.push(validateRequest(schema));
  return chain;
};

// For endpoints that only need fingerprint existence check (public write operations)
export const fingerprintWriteEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [verifyFingerprintExists];
  if (schema) chain.push(validateRequest(schema));
  return chain;
};

// For endpoints that need auth + ownership verification (protected operations)
export const protectedEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [validateAuthToken, verifyAccountOwnership];
  if (schema) chain.push(validateRequest(schema));
  return chain;
};

// For admin-only endpoints
export const adminEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [validateAuthToken, verifyAccountOwnership, verifyAdminRole];
  if (schema) chain.push(validateRequest(schema));
  return chain;
};
