import { RequestHandler } from "express";
import { ZodSchema } from "zod";
import {
  verifyFingerprintExists,
  validateRequest,
  verifyAccountOwnership,
  validateAuthToken,
  withMetrics,
  verifyAgent,
  requireRole,
} from ".";
import { ACCOUNT_ROLE } from "../constants";

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

// For agent-only endpoints
export const agentEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [withMetrics(verifyAgent, "agentVerification")];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

// For special access endpoints (requires agent_creator role)
export const specialAccessEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [
    withMetrics(validateAuthToken, "authValidation"),
    withMetrics(verifyAccountOwnership, "ownershipVerification"),
    withMetrics(requireRole(ACCOUNT_ROLE.agent_creator), "roleVerification"),
  ];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};

export const adminEndpoint = (schema?: ZodSchema) => {
  const chain: RequestHandler[] = [
    withMetrics(requireRole(ACCOUNT_ROLE.admin), "roleVerification"),
  ];
  if (schema) chain.push(withMetrics(validateRequest(schema), "schemaValidation"));
  return chain;
};
