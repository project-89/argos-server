import { z } from "zod";
import { ERROR_MESSAGES } from "../constants/api.constants";

export const ApiKeyRegisterSchema = z.object({
  body: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ApiKeyValidateSchema = z.object({
  body: z.object({
    key: z.string({
      required_error: ERROR_MESSAGES.MISSING_API_KEY,
      invalid_type_error: ERROR_MESSAGES.API_KEY_MUST_BE_STRING,
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ApiKeyDeactivateSchema = z.object({
  body: z.object({
    key: z.string({
      required_error: ERROR_MESSAGES.MISSING_API_KEY,
      invalid_type_error: ERROR_MESSAGES.API_KEY_MUST_BE_STRING,
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
