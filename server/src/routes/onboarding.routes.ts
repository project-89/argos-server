import { Router } from "express";
import { fingerprintWriteEndpoint, protectedEndpoint } from "../middleware/chains.middleware";
import {
  StartOnboardingRequestSchema,
  VerifyMissionRequestSchema,
  CompleteOnboardingRequestSchema,
  GetOnboardingProgressSchema,
} from "../schemas/onboarding.schema";
import {
  handleStartOnboarding,
  handleVerifyMission,
  handleGetProgress,
  handleCompleteOnboarding,
} from "../endpoints/onboarding.endpoint";

const router = Router();

// Start onboarding (requires fingerprint verification)
router.post(
  "/onboarding/start",
  ...fingerprintWriteEndpoint(StartOnboardingRequestSchema),
  handleStartOnboarding,
);

// Verify mission completion (protected - requires account ownership)
router.post(
  "/onboarding/:onboardingId/verify",
  ...protectedEndpoint(VerifyMissionRequestSchema),
  handleVerifyMission,
);

// Get onboarding progress (protected - requires account ownership)
router.get(
  "/onboarding/:onboardingId/progress",
  ...protectedEndpoint(GetOnboardingProgressSchema),
  handleGetProgress,
);

// Complete onboarding (protected - requires account ownership)
router.post(
  "/onboarding/:onboardingId/complete",
  ...protectedEndpoint(CompleteOnboardingRequestSchema),
  handleCompleteOnboarding,
);

export default router;
