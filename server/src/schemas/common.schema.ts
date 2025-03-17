import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";

// For MongoDB we'll use native Date objects
export const TimestampSchema = z.instanceof(Date);

// Common ID schemas
export const AccountIdSchema = z.string().min(1, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
export const FingerprintIdSchema = z.string().min(36).max(40, ERROR_MESSAGES.INVALID_FINGERPRINT);
export const VisitIdSchema = z.string().min(1, ERROR_MESSAGES.NOT_FOUND);
export const ImpressionIdSchema = z.string().min(1, ERROR_MESSAGES.NOT_FOUND);

// Common data schemas
export const WalletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
  message: ERROR_MESSAGES.INVALID_INPUT,
});

export const UnixTimestampSchema = z.number().int().positive();

// Common response fields
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Common request fields
export const PaginationParamsSchema = z.object({
  limit: z.string().transform(Number).optional().default("10"),
  offset: z.string().transform(Number).optional().default("0"),
});

export const DateRangeSchema = z.object({
  startDate: UnixTimestampSchema.optional(),
  endDate: UnixTimestampSchema.optional(),
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const ContactInfoSchema = z.object({
  email: z.string().email(ERROR_MESSAGES.INVALID_INPUT).optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

export const PreferencesSchema = z.object({
  isProfilePublic: z.boolean().optional(),
  showContactInfo: z.boolean().optional(),
  showStats: z.boolean().optional(),
});

// Export inferred types
export type BaseResponse = z.infer<typeof BaseResponseSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type AccountId = z.infer<typeof AccountIdSchema>;
export type FingerprintId = z.infer<typeof FingerprintIdSchema>;
export type VisitId = z.infer<typeof VisitIdSchema>;
export type ImpressionId = z.infer<typeof ImpressionIdSchema>;
export type WalletAddress = z.infer<typeof WalletAddressSchema>;
