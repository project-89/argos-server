import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { sendError } from "../utils/response";
import { ZodError } from "zod";

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
    return sendError(res, firstError.message, 400);
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return sendError(res, "Not allowed by CORS", 403);
  }

  // Handle API errors
  if (err instanceof ApiError) {
    // Preserve the original error message for API key errors
    if (
      err.message === "API key is required" ||
      err.message === "API key does not match fingerprint"
    ) {
      return sendError(res, err.message, err.statusCode);
    }
    return sendError(res, err.message, err.statusCode);
  }

  // Handle all other errors
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction ? "An unexpected error occurred" : err.message;
  return sendError(res, message, 500);
};
