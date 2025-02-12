import { z } from "zod";
import { ROLE } from "../constants";

// Enums
export const MissionTypeEnum = z.enum(["single", "multi"]);

export const MissionStatusEnum = z.enum([
  "available",
  "pending_stake",
  "active",
  "in_progress",
  "pending_validation",
  "in_validation",
  "completed",
  "failed",
  "expired",
]);

export const ParticipantTypeEnum = z.enum(["human", "agent", "any"]);

export const VerificationTypeEnum = z.enum([
  "auto_gps",
  "manual_gps",
  "photo",
  "video",
  "multi_photo",
  "document",
  "code",
  "manual",
]);

export const FailureConditionTypeEnum = z.enum(["Critical", "Standard", "Warning"]);

export const FailureConditionCategoryEnum = z.enum([
  "performance",
  "security",
  "compliance",
  "technical",
  "communication",
]);

// Base Schemas
export const BaseRequirementsSchema = z.object({
  timeLimit: z.number().positive(),
  stakeAmount: z.number().nonnegative(),
});

export const VerificationRequirementSchema = z.object({
  type: VerificationTypeEnum,
  description: z.string(),
  required: z.boolean(),
  autoVerify: z.boolean().optional(),
  metadata: z
    .object({
      minPhotos: z.number().optional(),
      maxPhotos: z.number().optional(),
      maxVideoLength: z.number().optional(),
      allowedFileTypes: z.array(z.string()).optional(),
      gpsCoordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
          radius: z.number(), // in meters
        })
        .optional(),
    })
    .optional(),
});

export const MissionObjectiveSchema = z.object({
  id: z.string(),
  task: z.string(),
  details: z.string(),
  verification: VerificationRequirementSchema.optional(),
  completed: z.boolean().optional(),
  verifiedAt: z.number().optional(),
  verificationData: z
    .object({
      type: VerificationTypeEnum,
      data: z.any(),
      verifiedBy: z.string().optional(),
      verificationNotes: z.string().optional(),
    })
    .optional(),
});

export const FailureConditionSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: FailureConditionTypeEnum,
  category: FailureConditionCategoryEnum,
  severity: FailureConditionTypeEnum.optional(),
});

export const FailureRecordSchema = z.object({
  condition: FailureConditionSchema,
  occurredAt: z.number(),
  details: z.string(),
  disputed: z.boolean().optional(),
  disputeDetails: z.string().optional(),
  disputeStatus: z.enum(["pending", "accepted", "rejected"]).optional(),
});

// Mission Requirements Schemas
export const SingleParticipantRequirementsSchema = z.object({
  objectives: z.array(MissionObjectiveSchema),
  minimumRank: z.nativeEnum(ROLE),
  categorySpecificRanks: z.record(z.nativeEnum(ROLE)).optional(),
  preferredAgent: z.string().optional(),
  specialRequirements: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export const TeamCompositionSchema = z.object({
  humans: z.number().optional(),
  agents: z.number().optional(),
  teamStructure: z.string().optional(),
  roleDistribution: z.string().optional(),
  collaborationRequirements: z.string().optional(),
});

export const MultiParticipantRequirementsSchema = z.object({
  minParticipants: z.number().positive(),
  maxParticipants: z.number().positive(),
  objectives: z.array(MissionObjectiveSchema),
  composition: TeamCompositionSchema,
  capabilities: z.array(z.string()).optional(),
});

// Core Mission Schemas
export const BaseMissionSchema = z.object({
  id: z.string(),
  type: MissionTypeEnum,
  title: z.string(),
  description: z.string(),
  status: MissionStatusEnum,
  createdAt: z.number(),
  expiryDate: z.number(),
  escrowAddress: z.string(),
  createdBy: z.string(),
  baseRequirements: BaseRequirementsSchema,
  failureConditions: z.array(FailureConditionSchema),
});

export const SingleParticipantMissionSchema = BaseMissionSchema.extend({
  type: z.literal(MissionTypeEnum.enum.single),
  participantType: ParticipantTypeEnum,
  requirements: SingleParticipantRequirementsSchema,
});

export const MultiParticipantMissionSchema = BaseMissionSchema.extend({
  type: z.literal(MissionTypeEnum.enum.multi),
  requirements: MultiParticipantRequirementsSchema,
});

export const MissionSchema = z.discriminatedUnion("type", [
  SingleParticipantMissionSchema,
  MultiParticipantMissionSchema,
]);

// History Fields Schema
export const MissionHistoryFieldsSchema = z.object({
  duration: z.number(),
  reward: z.number(),
  xpGained: z.number(),
  teamSize: z.number(),
  startedAt: z.number(),
  completedAt: z.number(),
  failedAt: z.number().optional(),
  objectives: z.array(MissionObjectiveSchema),
  failureRecords: z.array(FailureRecordSchema).optional(),
  tokenPayout: z
    .object({
      amount: z.number(),
      txHash: z.string(),
      timestamp: z.number(),
    })
    .optional(),
});

// Extended Mission Schema
export const MissionWithHistorySchema = z.intersection(MissionSchema, MissionHistoryFieldsSchema);

// Export types
export type Mission = z.infer<typeof MissionSchema>;
export type MissionWithHistory = z.infer<typeof MissionWithHistorySchema>;
export type SingleParticipantMission = z.infer<typeof SingleParticipantMissionSchema>;
export type MultiParticipantMission = z.infer<typeof MultiParticipantMissionSchema>;
export type MissionObjective = z.infer<typeof MissionObjectiveSchema>;
export type VerificationRequirement = z.infer<typeof VerificationRequirementSchema>;
export type FailureCondition = z.infer<typeof FailureConditionSchema>;
export type FailureRecord = z.infer<typeof FailureRecordSchema>;
