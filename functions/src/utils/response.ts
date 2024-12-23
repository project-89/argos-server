import { Response } from "express";
import { ApiError } from "./error";
import { v4 as uuidv4 } from "uuid";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
  requestId: string;
  timestamp: number;
}

/**
 * Creates a standardized success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  status = 200,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    requestId: uuidv4(),
    timestamp: Date.now(),
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

  // Add explicit message if provided
  if (message) {
    response.message = message;
  }

  return res.status(status).json(response);
};

/**
 * Creates a standardized error response
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
    case "Invalid API key format":
    case "API key is disabled":
    case "API key needs to be refreshed":
      errorMessage = "Invalid API key";
      statusCode = 401;
      break;

    // Keep specific error messages for these cases
    case "API key is required":
    case "API key does not match fingerprint":
      statusCode = errorMessage === "API key is required" ? 401 : 403;
      break;

    // Authorization errors - 403
    case "Not authorized":
      statusCode = 403;
      break;

    // Keep specific error messages for these cases
    case "Not authorized to revoke this API key":
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
    requestId: uuidv4(),
    timestamp: Date.now(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Creates a success response with a warning message
 */
export const sendWarning = <T>(res: Response, data: T, warning: string, status = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message: warning,
    requestId: uuidv4(),
    timestamp: Date.now(),
  };
  return res.status(status).json(response);
};

// Alias for sendSuccess for consistency with new naming
export const success = sendSuccess;
