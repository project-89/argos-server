import { Request, Response } from "express";
import { getCurrentPrices, getPriceHistory } from "../services";
import { sendSuccess, sendError, ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[Price Endpoint]";

export const handleGetCurrentPrices = async (req: Request, res: Response): Promise<Response> => {
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
    console.log(`${LOG_PREFIX} Successfully retrieved current prices`);
    return sendSuccess(res, prices);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in get current prices:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE));
  }
};

export const handleGetPriceHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { tokenId } = req.params;
    const history = await getPriceHistory(tokenId);
    console.log(`${LOG_PREFIX} Successfully retrieved price history`);
    return sendSuccess(res, history);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in get token price history:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE));
  }
};

export const getHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(`${LOG_PREFIX} Starting price history retrieval`);
    const { tokenId } = req.params;
    const history = await getPriceHistory(tokenId);
    console.log(`${LOG_PREFIX} Successfully retrieved price history`);
    return sendSuccess(res, history);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in get token price history:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE));
  }
};
