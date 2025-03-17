import { z } from "zod";
import { ACCOUNT_ROLE } from "../constants";

// Enums
export const MissionTypeEnum = z.enum(["single", "multi"]);

export const MissionStatusEnum = z.enum(["available", "active", "completed", "failed", "archived"]);

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
  description: z.string(),
  completed: z.boolean(),
  completedAt: z.number().optional(),
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
  minimumRank: z.nativeEnum(ACCOUNT_ROLE),
  categorySpecificRanks: z.record(z.nativeEnum(ACCOUNT_ROLE)).optional(),
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
  updatedAt: z.number(),
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

// Request validation schemas
export const CreateMissionRequestSchema = z.object({
  body: z.object({
    title: z.string(),
    description: z.string(),
    status: MissionStatusEnum,
    objectives: z.array(MissionObjectiveSchema),
    startedAt: z.number().optional(),
    completedAt: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const GetMissionRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const GetAvailableMissionsRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    limit: z.string().transform(Number).optional(),
  }),
  body: z.object({}).optional(),
});

export const UpdateMissionStatusRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: MissionStatusEnum,
  }),
  query: z.object({}).optional(),
});

export const UpdateMissionObjectivesRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    objectives: z.array(MissionObjectiveSchema),
  }),
  query: z.object({}).optional(),
});

export const GetActiveMissionsRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const AddFailureRecordRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    condition: z.object({
      id: z.string(),
      description: z.string(),
      type: z.enum(["Critical", "Standard", "Warning"]),
      category: z.enum(["performance", "security", "compliance", "technical", "communication"]),
      severity: z.enum(["Critical", "Standard", "Warning"]).optional(),
    }),
    occurredAt: z.number(),
    details: z.string(),
    disputed: z.boolean().optional(),
    disputeDetails: z.string().optional(),
    disputeStatus: z.enum(["pending", "accepted", "rejected"]).optional(),
  }),
  query: z.object({}).optional(),
});

export const DeleteMissionRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

// Request types
export type CreateMissionRequest = z.infer<typeof CreateMissionRequestSchema>;
export type GetMissionRequest = z.infer<typeof GetMissionRequestSchema>;
export type GetAvailableMissionsRequest = z.infer<typeof GetAvailableMissionsRequestSchema>;
export type UpdateMissionStatusRequest = z.infer<typeof UpdateMissionStatusRequestSchema>;
export type UpdateMissionObjectivesRequest = z.infer<typeof UpdateMissionObjectivesRequestSchema>;
export type GetActiveMissionsRequest = z.infer<typeof GetActiveMissionsRequestSchema>;
export type AddFailureRecordRequest = z.infer<typeof AddFailureRecordRequestSchema>;
export type DeleteMissionRequest = z.infer<typeof DeleteMissionRequestSchema>;
