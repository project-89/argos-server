import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services/priceService";
import { validateQuery, validateParams } from "../middleware/validation.middleware";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/response";
import { toUnixMillis } from "../utils/timestamp";

export const getCurrent = [
  validateQuery(
    z.object({
      symbols: z.string().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { symbols } = req.query;
      const tokenSymbols = symbols
        ? symbols
            .toString()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const prices = await getCurrentPrices(tokenSymbols);
      return sendSuccess(res, prices);
    } catch (error) {
      console.error("Error in get current prices:", error);
      return sendError(res, error instanceof Error ? error : "Failed to fetch current prices");
    }
  },
];

export const getHistory = [
  validateParams(
    z.object({
      tokenId: z.string().min(1, "Token ID is required"),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { tokenId } = req.params;
      const history = await getPriceHistory(tokenId);
      const formattedHistory = history.map((item) => ({
        ...item,
        timestamp: toUnixMillis(item.createdAt),
        createdAt: undefined,
      }));
      return sendSuccess(res, formattedHistory);
    } catch (error) {
      console.error("Error in get token price history:", error);
      return sendError(res, error instanceof Error ? error : "Failed to fetch token price history");
    }
  },
];
