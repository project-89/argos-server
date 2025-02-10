import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { sendError } from "../utils/response";
import { ZodError } from "zod";
import { ERROR_MESSAGES, HTTP_STATUS } from "../constants";

const LOG_PREFIX = "[Error Handler]";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  // Log the error for debugging
  console.error(LOG_PREFIX, {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    return sendError(
      res,
      new ApiError(HTTP_STATUS.BAD_REQUEST, firstError.message),
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return sendError(
      res,
      new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.CORS_ERROR),
      HTTP_STATUS.FORBIDDEN,
    );
  }

  // Handle API errors
  if (err instanceof ApiError) {
    const isProduction = process.env.NODE_ENV === "production";
    const additionalData = !isProduction && err.stack ? { stack: err.stack } : undefined;
    return sendError(res, err, err.statusCode, additionalData);
  }

  // Handle 404 errors
  if (err.message?.includes("Cannot GET") || err.message?.includes("Cannot POST")) {
    // Let endpoints handle their own specific 404 messages
    return sendError(
      res,
      new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND),
      HTTP_STATUS.NOT_FOUND,
    );
  }

  // Handle all other errors
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction ? ERROR_MESSAGES.INTERNAL_ERROR : err.message;
  const additionalData = !isProduction && err.stack ? { stack: err.stack } : undefined;
  return sendError(
    res,
    new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message),
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    additionalData,
  );
};
