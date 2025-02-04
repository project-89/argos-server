import { ERROR_MESSAGES } from "../constants";
import { z } from "zod";

export const TagsSchema = z.record(z.string());

export const CheckTagSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    fingerprintId: z.string(),
    tagType: z.string(),
  }),
  body: z.object({}).optional(),
});

export const GetTagLeaderboardSchema = z.object({
  query: z.object({
    timeFrame: z.string(),
    limit: z.number(),
    offset: z.number(),
    fingerprintId: z.string(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const TagUserSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({
    targetFingerprintId: z.string({
      required_error: ERROR_MESSAGES.TARGET_FINGERPRINT_ID_REQUIRED,
      invalid_type_error: ERROR_MESSAGES.FINGERPRINT_MUST_BE_STRING,
    }),
  }),
  params: z.object({}).optional(),
});
