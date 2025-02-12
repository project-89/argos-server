import { z } from "zod";
import { TimestampSchema, AccountIdSchema } from ".";

// Social verification proof schemas
export const TwitterVerificationProofSchema = z.object({
  type: z.literal("X"),
  tweetId: z.string(),
  tweetUrl: z.string().url(),
  username: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export const SocialVerificationProofSchema = z.discriminatedUnion("type", [
  TwitterVerificationProofSchema,
]);

export const OnboardingStageSchema = z.enum([
  "initial",
  "social_created",
  "wallet_created",
  "hivemind_connected",
]);

export const OnboardingMissionSchema = z.object({
  id: z.string(),
  type: z.enum(["social_creation", "wallet_creation"]),
  status: z.enum(["pending", "completed"]),
  completedAt: TimestampSchema.optional(),
  proof: z.record(z.any()).optional(),
});

export const OnboardingProgressSchema = z.object({
  id: z.string(),
  fingerprintId: z.string(),
  accountId: AccountIdSchema.optional(),
  stage: z.enum(["initial", "social_created", "wallet_created", "hivemind_connected"]),
  missions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["social_creation", "wallet_creation"]),
      status: z.enum(["pending", "completed"]),
      completedAt: TimestampSchema.optional(),
      proof: z.record(z.any()).optional(),
    }),
  ),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  metadata: z.record(z.any()).optional(),
});

export const StartOnboardingRequestSchema = z.object({
  fingerprintId: z.string(),
});

export const VerifyMissionRequestSchema = z.object({
  onboardingId: z.string(),
  missionId: z.string(),
  proof: SocialVerificationProofSchema,
});

export const CompleteOnboardingRequestSchema = z.object({
  onboardingId: z.string(),
  walletAddress: z.string(),
  signature: z.string(),
});

export const GetOnboardingProgressSchema = z.object({
  params: z.object({
    onboardingId: z.string(),
  }),
});

// Types derived from schemas
export type OnboardingStage = z.infer<typeof OnboardingStageSchema>;
export type OnboardingMission = z.infer<typeof OnboardingMissionSchema>;
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;
export type StartOnboardingRequest = z.infer<typeof StartOnboardingRequestSchema>;
export type VerifyMissionRequest = z.infer<typeof VerifyMissionRequestSchema>;
export type CompleteOnboardingRequest = z.infer<typeof CompleteOnboardingRequestSchema>;
export type GetOnboardingProgressRequest = z.infer<typeof GetOnboardingProgressSchema>;
