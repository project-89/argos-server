import { Router } from "express";
import { protectedEndpoint, fingerprintWriteEndpoint } from "../middleware/chains.middleware";
import {
  ProfileCreateSchema,
  ProfileUpdateSchema,
  ProfileGetSchema,
  ProfileSearchSchema,
} from "../schemas";
import {
  handleCreateProfile,
  handleUpdateProfile,
  handleGetProfile,
  handleSearchProfiles,
} from "../endpoints";

const router = Router();

// Profile creation only requires fingerprint verification
router.post("/profiles", ...fingerprintWriteEndpoint(ProfileCreateSchema), handleCreateProfile);

// These operations require full authentication and ownership verification
router.get("/profiles/:id", ...protectedEndpoint(ProfileGetSchema), handleGetProfile);
router.patch("/profiles/:id", ...protectedEndpoint(ProfileUpdateSchema), handleUpdateProfile);
router.get("/profiles", ...protectedEndpoint(ProfileSearchSchema), handleSearchProfiles);

export default router;
