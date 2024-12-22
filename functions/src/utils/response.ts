import { Response } from "express";
import { ApiError } from "./error";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

export const sendSuccess = <T>(res: Response, data: T, status = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  // If data has a message property, include it in the response
  if (data && typeof data === "object" && "message" in data) {
    response.message = (data as any).message;
  }

  return res.status(status).json(response);
};

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
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

export const sendWarning = <T>(res: Response, data: T, warning: string, status = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message: warning,
  };
  return res.status(status).json(response);
};
