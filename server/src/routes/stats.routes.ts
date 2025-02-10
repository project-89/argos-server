import { Router } from "express";
import { publicEndpoint } from "../middleware/chains.middleware";
import { StatsGetSchema } from "../schemas";
import { handleGetStats } from "../endpoints";

const router = Router();

// Stats are public information about user achievements and activity
router.get("/stats/:id", ...publicEndpoint(StatsGetSchema), handleGetStats);

export default router;
