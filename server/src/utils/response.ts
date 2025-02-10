import { Response } from "express";
import { ApiError } from "./error";
import { v4 as uuidv4 } from "uuid";
import { ApiSuccessResponse, ApiErrorResponse } from "../schemas";
import { getCurrentUnixMillis } from "./timestamp";

/**
 * Creates a standardized success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  status = 200,
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    requestId: uuidv4(),
    timestamp: getCurrentUnixMillis(),
  };

  // Add message if provided
  if (message || (data && typeof data === "object" && "message" in data)) {
    response.message = message || (data as any).message;
  }

  return res.status(status).json(response);
};

/**
 * Creates a standardized error response
 */
export const sendError = (
  res: Response,
  error: Error | ApiError | string,
  status?: number,
  additionalData?: Record<string, any>,
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    error: error instanceof Error ? error.message : error,
    requestId: uuidv4(),
    timestamp: getCurrentUnixMillis(),
    ...additionalData,
  };

  // Add error code if available
  if (error instanceof ApiError) {
    response.code = error.name;
    // Only use error's status code if none was explicitly passed
    status = status || error.statusCode;
  }

  return res.status(status || 500).json(response);
};

/**
 * Creates a success response with a warning message
 * This is useful for operations that succeeded but with caveats
 */
export const sendWarning = <T>(res: Response, data: T, warning: string, status = 200): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message: warning,
    requestId: uuidv4(),
    timestamp: getCurrentUnixMillis(),
  };

  return res.status(status).json(response);
};
