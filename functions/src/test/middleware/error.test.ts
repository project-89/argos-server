import { describe, it, expect } from "@jest/globals";
import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../utils/error";
import { errorHandler } from "../../middleware/error.middleware";
import { ERROR_MESSAGES } from "../../constants/api";

describe("Error Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it("should handle ApiError with correct status and message", () => {
    const error = new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "ApiError",
        error: ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      }),
    );
  });

  it("should handle ZodError with 400 status and validation details", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = schema.safeParse({ name: 123, age: "invalid" });
    if (!result.success) {
      const error = result.error;

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "ApiError",
          error: expect.stringContaining("Expected string"),
          requestId: expect.any(String),
          timestamp: expect.any(Number),
        }),
      );
    }
  });

  it("should handle CORS error with 403 status", () => {
    const error = new Error("Not allowed by CORS");
    error.name = "CORS Error";

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "ApiError",
        error: "Not allowed by CORS",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      }),
    );
  });

  it("should handle generic Error with 500 status", () => {
    const error = new Error("Something went wrong");

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "ApiError",
        error: "Something went wrong",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      }),
    );
  });

  it("should include stack trace in development environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const error = new Error("Test error");
    error.stack = "Test stack trace";

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "ApiError",
        error: "Test error",
        requestId: expect.any(String),
        timestamp: expect.any(Number),
        stack: "Test stack trace",
      }),
    );

    process.env.NODE_ENV = originalEnv;
  });

  it("should not include stack trace in production environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("Test error");
    error.stack = "Test stack trace";

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "ApiError",
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      }),
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.any(String),
      }),
    );

    process.env.NODE_ENV = originalEnv;
  });
});
