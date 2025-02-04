/**
 * Custom error class for API errors with HTTP status codes
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Creates an ApiError from any error type
   * If the error is already an ApiError, returns it as is
   * Otherwise, wraps it in a new ApiError with the given status and message
   */
  static from(error: unknown, defaultStatus: number = 500, defaultMessage: string): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError(defaultStatus, error.message);
    }

    return new ApiError(defaultStatus, defaultMessage);
  }
}
