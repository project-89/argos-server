import { Request, Response } from "express";
import { ApiError, sendSuccess, sendError } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import {
  createAccount,
  getAccountById,
  getAccountByWalletAddress,
  updateAccount,
} from "../services";

const LOG_PREFIX = "[Account Endpoint]";

export const handleCreateAccount = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting account creation`);
    const { walletAddress, fingerprintId, metadata } = req.body;
    const account = await createAccount(walletAddress, fingerprintId, metadata);
    console.log(`${LOG_PREFIX} Successfully created account:`, { id: account.id });
    return sendSuccess(res, account, "Account created successfully", 201);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating account:`, error);
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT));
  }
};

export const handleGetAccount = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting account retrieval`);
    const { id } = req.params;
    const account = await getAccountById(id);

    if (!account) {
      return sendError(res, new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND));
    }

    console.log(`${LOG_PREFIX} Successfully retrieved account:`, { id });
    return sendSuccess(res, account);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error retrieving account:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

export const handleGetAccountByWallet = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting account retrieval by wallet`);
    const { walletAddress } = req.params;
    const account = await getAccountByWalletAddress(walletAddress);

    if (!account) {
      return sendError(res, new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND));
    }

    console.log(`${LOG_PREFIX} Successfully retrieved account by wallet:`, { walletAddress });
    return sendSuccess(res, account);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error retrieving account by wallet:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

export const handleUpdateAccount = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting account update`);
    const { id } = req.params;
    const account = await updateAccount({ accountId: id, request: req.body });
    console.log(`${LOG_PREFIX} Successfully updated account:`, { id });
    return sendSuccess(res, account, "Account updated successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating account:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};
