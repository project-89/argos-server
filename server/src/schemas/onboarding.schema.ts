import { z } from "zod";
import { TimestampSchema, AccountIdSchema } from ".";
import { SocialPlatformSchema } from "./social.schema";

// Social verification proof schemas
export const SocialVerificationProofSchema = z.object({
  type: z.literal("social"),
  platform: SocialPlatformSchema,
  postId: z.string(),
  postUrl: z.string().url(),
  username: z.string(),
  content: z.string(),
  createdAt: z.number(),
});

export const WalletVerificationProofSchema = z.object({
  type: z.literal("wallet"),
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  createdAt: z.number(),
});

export const VerificationProofSchema = z.discriminatedUnion("type", [
  SocialVerificationProofSchema,
  WalletVerificationProofSchema,
  // Future verification types would go here
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
  status: z.enum(["pending", "completed", "failed"]),
  completedAt: TimestampSchema.optional(),
  attempts: z.number().default(0),
  lastAttempt: TimestampSchema.optional(),
  proof: VerificationProofSchema.optional(),
  verificationMetadata: z
    .object({
      platform: z.enum(["x", "wallet"]),
      verificationMethod: z.enum(["social_proof", "signature"]),
      verifiedAt: TimestampSchema.optional(),
    })
    .optional(),
});

export const OnboardingProgressSchema = z.object({
  id: z.string(),
  fingerprintId: z.string(),
  accountId: AccountIdSchema.optional(),
  stage: OnboardingStageSchema,
  missions: z.array(OnboardingMissionSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  metadata: z
    .object({
      verifiedSocialIdentity: z
        .object({
          platform: SocialPlatformSchema,
          hashedUsername: z.string(),
          usernameSalt: z.string(),
          anonSocialUserId: z.string(),
          previouslyExisted: z.boolean(),
          verifiedAt: TimestampSchema,
        })
        .optional(),
      verifiedWallet: z
        .object({
          address: z.string(),
          verifiedAt: TimestampSchema,
          signatureProof: z.string(),
        })
        .optional(),
      failureReasons: z
        .array(
          z.object({
            missionId: z.string(),
            reason: z.string(),
            timestamp: TimestampSchema,
          }),
        )
        .optional(),
    })
    .optional(),
});

export const StartOnboardingRequestSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    platform: SocialPlatformSchema.optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const VerifyMissionRequestSchema = z.object({
  params: z.object({
    onboardingId: z.string(),
  }),
  body: z.object({
    missionId: z.string(),
    proof: VerificationProofSchema,
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
});

export const CompleteOnboardingRequestSchema = z.object({
  params: z.object({
    onboardingId: z.string(),
  }),
  body: z.object({
    walletAddress: z.string(),
    signature: z.string(),
    message: z.string(),
    timestamp: z.number(),
  }),
  query: z.object({}).optional(),
});

export const GetOnboardingProgressSchema = z.object({
  params: z.object({
    onboardingId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const OnboardingStatusResponseSchema = z.object({
  id: z.string(),
  stage: OnboardingStageSchema,
  currentMission: OnboardingMissionSchema.optional(),
  nextMission: OnboardingMissionSchema.optional(),
  progress: z.number(),
  remainingMissions: z.number(),
  timeElapsed: z.number(),
  canProceed: z.boolean(),
});

export const VerificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  nextStage: OnboardingStageSchema,
  verificationDetails: z.object({
    method: z.string(),
    timestamp: TimestampSchema,
    platform: SocialPlatformSchema,
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
export type OnboardingStatusResponse = z.infer<typeof OnboardingStatusResponseSchema>;
export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;
export type SocialVerificationProof = z.infer<typeof SocialVerificationProofSchema>;
export type WalletVerificationProof = z.infer<typeof WalletVerificationProofSchema>;
