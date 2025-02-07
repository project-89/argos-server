import { Router } from "express";
import { publicEndpoint } from "../middleware/chains.middleware";
import { getCurrentPriceSchema, getPriceHistorySchema } from "../schemas";

const router = Router();

// All price endpoints are public
router.get("/prices/current", ...publicEndpoint(getCurrentPriceSchema));
router.get("/prices/history/:tokenId", ...publicEndpoint(getPriceHistorySchema));

export default router;
