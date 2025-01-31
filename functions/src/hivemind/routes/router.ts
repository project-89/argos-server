import { Router } from "express";
import { verifyProfileAccess } from "../middleware/profileOwnership.middleware";
import { verifyOwnership } from "../../middleware/ownershipCheck.middleware";
import {
  createProfile,
  getProfile,
  getProfileByWallet,
  updateProfile,
} from "../endpoints/profile.endpoint";
import { getStats, updateStats } from "../endpoints/stats.endpoint";
import {
  createCapability,
  deleteCapability,
  getCapabilities,
  updateCapability,
  findSimilarSkills,
} from "../endpoints/capability.endpoint";

const router = Router();

// Profile routes
router.post("/profiles", verifyOwnership, createProfile);
router.get("/profiles/:id", verifyOwnership, verifyProfileAccess, getProfile);
router.get("/profiles/wallet/:address", verifyOwnership, getProfileByWallet);
router.put("/profiles/:id", verifyOwnership, verifyProfileAccess, updateProfile);

// Stats routes
router.get("/stats/:profileId", verifyOwnership, verifyProfileAccess, getStats);
router.put("/stats/:profileId", verifyOwnership, verifyProfileAccess, updateStats);

// Capabilities routes
router.get("/skills/search", verifyOwnership, findSimilarSkills);
router.post("/capabilities/:profileId", verifyOwnership, verifyProfileAccess, createCapability);
router.get("/capabilities/:profileId", verifyOwnership, verifyProfileAccess, getCapabilities);
router.put(
  "/capabilities/:profileId/:capabilityId",
  verifyOwnership,
  verifyProfileAccess,
  updateCapability,
);
router.delete(
  "/capabilities/:profileId/:capabilityId",
  verifyOwnership,
  verifyProfileAccess,
  deleteCapability,
);

export default router;
