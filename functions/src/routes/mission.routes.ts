import { Router } from "express";
import { protectedEndpoint, fingerprintWriteEndpoint } from "../middleware/chains.middleware";
import {
  MissionSchema,
  MissionStatusEnum,
  MissionObjectiveSchema,
} from "../schemas/mission.schema";
import { z } from "zod";
import {
  handleCreateMission,
  handleGetMission,
  handleGetAvailableMissions,
  handleUpdateMissionStatus,
  handleUpdateMissionObjectives,
  handleGetActiveMissions,
  handleAddFailureRecord,
  handleDeleteMission,
} from "../endpoints/mission.endpoint";

const router = Router();

// Create mission (admin only)
router.post("/missions", ...protectedEndpoint(MissionSchema), handleCreateMission);

// Get mission by ID
router.get(
  "/missions/:id",
  ...fingerprintWriteEndpoint(z.object({ id: z.string() })),
  handleGetMission,
);

// Get available missions
router.get(
  "/missions/available",
  ...fingerprintWriteEndpoint(z.object({ limit: z.string().transform(Number).optional() })),
  handleGetAvailableMissions,
);

// Update mission status (admin only)
router.patch(
  "/missions/:id/status",
  ...protectedEndpoint(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({ status: MissionStatusEnum }),
    }),
  ),
  handleUpdateMissionStatus,
);

// Update mission objectives (admin only)
router.patch(
  "/missions/:id/objectives",
  ...protectedEndpoint(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({ objectives: z.array(MissionObjectiveSchema) }),
    }),
  ),
  handleUpdateMissionObjectives,
);

// Get active missions for participant
router.get("/missions/active", ...fingerprintWriteEndpoint(z.object({})), handleGetActiveMissions);

// Add failure record (admin only)
router.post(
  "/missions/:id/failure",
  ...protectedEndpoint(
    z.object({
      params: z.object({ id: z.string() }),
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
    }),
  ),
  handleAddFailureRecord,
);

// Delete mission (admin only)
router.delete(
  "/missions/:id",
  ...protectedEndpoint(z.object({ id: z.string() })),
  handleDeleteMission,
);

export default router;
