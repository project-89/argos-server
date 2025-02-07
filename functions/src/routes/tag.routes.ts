import { Router } from "express";
import { publicEndpoint } from "../middleware/chains.middleware";
import { TagUserSchema } from "../schemas/tag.schema";
import { handleTagUser } from "../endpoints";

const router = Router();

// Public tag operations (social media driven)
router.post("/tags/:tagType", ...publicEndpoint(TagUserSchema), handleTagUser);

export default router;
