import { z } from "zod";

export const CapabilityCreateSchema = z.object({
  params: z.object({
    profileId: z.string(),
  }),
  body: z.object({
    name: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
    type: z.enum(["Development", "Design", "Marketing", "Management"]),
    description: z.string().optional(),
  }),
  query: z.object({}).optional(),
});

export const CapabilityGetSchema = z.object({
  params: z.object({
    profileId: z.string(),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const CapabilityUpdateSchema = z.object({
  params: z.object({
    profileId: z.string(),
    capabilityId: z.string(),
  }),
  body: z.object({
    name: z.string().optional(),
    level: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]).optional(),
    type: z.enum(["Development", "Design", "Marketing", "Management"]).optional(),
    description: z.string().optional(),
  }),
  query: z.object({}).optional(),
});

export const CapabilityDeleteSchema = z.object({
  params: z.object({
    profileId: z.string(),
    capabilityId: z.string(),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
