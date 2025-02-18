import { Router } from "express";
import { publicEndpoint, protectedEndpoint } from "../middleware/chains.middleware";
import {
  TagUserRequestSchema,
  GetUserTagsSchema,
  GetTagLeaderboardSchema,
} from "../schemas/tag.schema";
import { handleTagUser, handleGetUserTags, handleGetLeaderboard } from "../endpoints";

const router = Router();

// Public tag operations (social media driven)
router.post("/tags/:tagType", ...publicEndpoint(TagUserRequestSchema), handleTagUser);

// Public leaderboard
router.get("/tags/leaderboard", ...publicEndpoint(GetTagLeaderboardSchema), handleGetLeaderboard);

// Protected detailed tag history (requires authentication)
router.get("/tags/history", ...protectedEndpoint(GetUserTagsSchema), handleGetUserTags);

export default router;
