import { Request, Response } from "express";
import { ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import {
  createAccount,
  getAccountById,
  getAccountByWalletAddress,
  updateAccount,
} from "../services";

export const handleCreateAccount = async (req: Request, res: Response) => {
  try {
    const account = await createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    throw ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT);
  }
};

export const handleGetAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await getAccountById(id);

    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const handleGetAccountByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const account = await getAccountByWalletAddress(walletAddress);

    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const handleUpdateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await updateAccount({ accountId: id, request: req.body });
    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
