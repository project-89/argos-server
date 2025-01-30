import { z } from "zod";

// Profile schemas
const contactInfoSchema = z.object({
  email: z.string().email().optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

const preferencesSchema = z.object({
  isProfilePublic: z.boolean().optional(),
  showContactInfo: z.boolean().optional(),
  showStats: z.boolean().optional(),
});
// Request schemas
export const hivemindSchemas = {
  // Stats schemas
  statsInitialize: z.object({
    params: z.object({
      profileId: z.string(),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),

  statsGet: z.object({
    params: z.object({
      profileId: z.string(),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),

  statsUpdate: z.object({
    params: z.object({
      profileId: z.string(),
    }),
    body: z.object({
      missionsCompleted: z.number().optional(),
      successRate: z
        .number()
        .min(0, "Success rate must be between 0 and 100")
        .max(100, "Success rate must be between 0 and 100")
        .optional(),
      totalRewards: z.number().optional(),
      reputation: z.number().optional(),
    }),
    query: z.object({}).optional(),
  }),

  // Capability schemas
  capabilityCreate: z.object({
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
  }),

  capabilityGet: z.object({
    params: z.object({
      profileId: z.string(),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),

  capabilityUpdate: z.object({
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
  }),

  capabilityDelete: z.object({
    params: z.object({
      profileId: z.string(),
      capabilityId: z.string(),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),
  profileCreate: z.object({
    body: z.object({
      walletAddress: z.string(),
      fingerprintId: z.string(),
      username: z.string().min(3).max(30),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      contactInfo: contactInfoSchema.optional(),
      preferences: preferencesSchema.optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  profileGet: z.object({
    params: z.object({
      id: z.string(),
    }),
    query: z.object({}).optional(),
    body: z.object({}).optional(),
  }),

  profileGetByWallet: z.object({
    params: z.object({
      walletAddress: z.string(),
    }),
    query: z.object({}).optional(),
    body: z.object({}).optional(),
  }),

  profileUpdate: z.object({
    params: z.object({
      id: z.string(),
    }),
    body: z.object({
      username: z.string().min(3).max(30).optional(),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      contactInfo: contactInfoSchema.optional(),
      preferences: preferencesSchema.optional(),
    }),
    query: z.object({}).optional(),
  }),

  // Skill search schema
  skillSearch: z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
  }),
};
