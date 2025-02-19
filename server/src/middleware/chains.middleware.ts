import { RequestHandler } from "express";
import { ZodSchema } from "zod";
import {
  verifyFingerprintExists,
  validateRequest,
  verifyAccountOwnership,
  validateAuthToken,
  withMetrics,
  verifyAdmin,
  verifyAgent,
} from ".";

/**
 * Middleware chain factory functions for different endpoint types
 */

// For endpoints that need no authentication (public write operations)
export const publicEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

// For endpoints that only need fingerprint existence check (public write operations)
export const fingerprintWriteEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [withMetrics(verifyFingerprintExists, "fingerprintVerification")];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

// For endpoints that need auth + ownership verification (protected operations)
export const protectedEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [
    withMetrics(validateAuthToken, "authValidation"),
    withMetrics(verifyAccountOwnership, "ownershipVerification"),
  ];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

// For admin-only endpoints
export const adminEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [
    withMetrics(validateAuthToken, "authValidation"),
    withMetrics(verifyAccountOwnership, "ownershipVerification"),
    withMetrics(verifyAdmin, "adminVerification"),
  ];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

// For agent-only endpoints
export const agentEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [withMetrics(verifyAgent, "agentVerification")];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};
