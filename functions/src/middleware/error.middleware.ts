import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { sendError } from "../utils/response";
import { ZodError } from "zod";
import { ERROR_MESSAGES } from "../constants/api";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  // Log the error for debugging
  console.error("[Error Handler]", {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    return sendError(res, new ApiError(400, firstError.message), 400);
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return sendError(res, new ApiError(403, "Not allowed by CORS"), 403);
  }

  // Handle API errors
  if (err instanceof ApiError) {
    const isProduction = process.env.NODE_ENV === "production";
    const additionalData = !isProduction && err.stack ? { stack: err.stack } : undefined;
    return sendError(res, err, err.statusCode, additionalData);
  }

  // Handle all other errors
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction ? ERROR_MESSAGES.INTERNAL_ERROR : err.message;
  const additionalData = !isProduction && err.stack ? { stack: err.stack } : undefined;
  return sendError(res, new ApiError(500, message), 500, additionalData);
};
