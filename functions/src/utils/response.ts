import { Response } from "express";
import { ApiError } from "./error";
import { randomUUID } from "crypto";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
  requestId: string;
  timestamp: string;
}

/**
 * Creates a standardized success response
 * @param res Express Response object
 * @param data Response data
 * @param status HTTP status code (default: 200)
 */
export const sendSuccess = <T>(res: Response, data: T, status = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  // Handle message property consistently
  if (data && typeof data === "object") {
    if ("message" in data) {
      response.message = (data as any).message;
      // If data only contains a message, don't duplicate it in data
      if (Object.keys(data).length === 1) {
        delete response.data;
      }
    }
  }

  return res.status(status).json(response);
};

/**
 * Creates a standardized error response
 * @param res Express Response object
 * @param error Error object or message
 * @param status HTTP status code (default: 500)
 * @param details Additional error details
 */
export const sendError = (
  res: Response,
  error: Error | ApiError | string,
  status = 500,
  details?: any[],
): Response => {
  // Standardize error messages
  let errorMessage = error instanceof Error ? error.message : error;
  let statusCode = status;

  // Use ApiError status code if available
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
  }

  // Standardize common error messages
  switch (errorMessage) {
    // Authentication errors - 401
    case "API key not found":
    case "Invalid API key format":
    case "API key is disabled":
    case "API key needs to be refreshed":
      errorMessage = "Invalid API key";
      statusCode = 401;
      break;

    // Authorization errors - 403
    case "Not authorized":
      statusCode = 403;
      break;

    // Keep specific error messages for these cases
    case "Not authorized to revoke this API key":
    case "API key does not match fingerprint":
      statusCode = 403;
      break;

    // Not Found errors - 404
    case "Fingerprint not found":
    case "Resource not found":
      statusCode = 404;
      break;
  }

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Creates a success response with a warning message
 * @param res Express Response object
 * @param data Response data
 * @param warning Warning message
 * @param status HTTP status code (default: 200)
 */
export const sendWarning = <T>(res: Response, data: T, warning: string, status = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message: warning,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(response);
};
