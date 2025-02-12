import { z } from "zod";
import { TimestampSchema } from "./common.schema";

export enum SkillLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
  Expert = "Expert",
}

export const ProfileCapabilityModelSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  skillId: z.string(),
  level: z.nativeEnum(SkillLevel),
  isVerified: z.boolean(),
  verifierId: z.string().optional(),
  verifiedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ProfileCapabilitySchema = ProfileCapabilityModelSchema.omit({
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
}).extend({
  verifiedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Input Schemas
export const CreateCapabilityInputSchema = z.object({
  name: z.string(),
  level: z.nativeEnum(SkillLevel),
  type: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  aliases: z.array(z.string()).optional(),
});

export const UpdateCapabilityInputSchema = z.object({
  name: z.string().optional(),
  level: z.nativeEnum(SkillLevel).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  parentType: z.string().optional(),
});

export const SearchCapabilitiesInputSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  parentType: z.string().optional(),
});

// Request/Response Validation Schemas
export const CapabilityCreateSchema = z.object({
  params: z.object({
    profileId: z.string(),
  }),
  body: CreateCapabilityInputSchema,
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
  body: UpdateCapabilityInputSchema,
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

// Combined Response Schema
export const CapabilityWithSkillSchema = z.object({
  // Capability fields
  id: z.string(),
  profileId: z.string(),
  skillId: z.string(),
  level: z.nativeEnum(SkillLevel),
  isVerified: z.boolean(),
  verifierId: z.string().optional(),
  verifiedAt: z.number().optional(),
  // Skill fields
  name: z.string(),
  type: z.string(),
  category: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()),
  aliases: z.array(z.string()),
  parentType: z.string().optional(),
  useCount: z.number(),
  // Common timestamp fields (as Unix timestamps)
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type CapabilityWithSkill = z.infer<typeof CapabilityWithSkillSchema>;

// Type Exports
export type ProfileCapabilityModel = z.infer<typeof ProfileCapabilityModelSchema>;
export type ProfileCapability = z.infer<typeof ProfileCapabilitySchema>;
export type CreateCapabilityInput = z.infer<typeof CreateCapabilityInputSchema>;
export type UpdateCapabilityInput = z.infer<typeof UpdateCapabilityInputSchema>;
export type SearchCapabilitiesInput = z.infer<typeof SearchCapabilitiesInputSchema>;
