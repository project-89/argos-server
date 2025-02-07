import { z } from "zod";

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
