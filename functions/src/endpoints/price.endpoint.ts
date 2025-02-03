import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services/price.service";
import { validateQuery, validateParams } from "../middleware/validation.middleware";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/response";
import { ERROR_MESSAGES } from "../constants/api.constants";
import { ApiError } from "../utils/error";

const LOG_PREFIX = "[Price Endpoint]";

export const getCurrent = [
  validateQuery(
    z.object({
      symbols: z.string().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting current price retrieval`);
      const { symbols } = req.query;
      const tokenSymbols = symbols
        ? symbols
            .toString()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const prices = await getCurrentPrices(tokenSymbols);
      console.log(`${LOG_PREFIX} Successfully retrieved current prices`);
      return sendSuccess(res, prices);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in get current prices:`, error);
      if (error instanceof ApiError) {
        return sendError(res, error);
      }
      return sendError(res, new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE));
    }
  },
];

export const getHistory = [
  validateParams(
    z.object({
      tokenId: z.string().min(1, ERROR_MESSAGES.NOT_FOUND),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting price history retrieval`);
      const { tokenId } = req.params;
      const history = await getPriceHistory(tokenId);
      console.log(`${LOG_PREFIX} Successfully retrieved price history`);
      return sendSuccess(res, history);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in get token price history:`, error);
      if (error instanceof ApiError) {
        return sendError(res, error);
      }
      if (error instanceof Error && error.message.includes("rate limit")) {
        return sendError(res, new ApiError(429, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED));
      }
      return sendError(res, new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE));
    }
  },
];
