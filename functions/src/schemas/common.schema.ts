import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

// Custom Zod schema for Firestore Timestamp
export const TimestampSchema = z.custom<Timestamp>((val) => {
  return val instanceof Timestamp;
}, "Must be a Firestore Timestamp");

export const ContactInfoSchema = z.object({
  email: z.string().email().optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

export const PreferencesSchema = z.object({
  isProfilePublic: z.boolean().optional(),
  showContactInfo: z.boolean().optional(),
  showStats: z.boolean().optional(),
});
