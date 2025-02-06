import { Request, Response } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants";
import {
  createAccount,
  getAccountById,
  getAccountByWalletAddress,
  updateAccount,
  linkFingerprint,
  unlinkFingerprint,
} from "../services/account.service";

export const create = async (req: Request, res: Response) => {
  try {
    const account = await createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    throw ApiError.from(error, 400, ERROR_MESSAGES.INVALID_INPUT);
  }
};

export const get = async (req: Request, res: Response) => {
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

export const getByWallet = async (req: Request, res: Response) => {
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

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await updateAccount(id, req.body);
    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const link = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await linkFingerprint(id, req.body);
    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const unlink = async (req: Request, res: Response) => {
  try {
    const { id, fingerprintId } = req.params;
    const account = await unlinkFingerprint(id, fingerprintId);
    res.json(account);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
