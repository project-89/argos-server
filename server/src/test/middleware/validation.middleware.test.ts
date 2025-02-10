import { describe, it, expect } from "@jest/globals";
import { Request, Response } from "express";
import { z } from "zod";
import { validateRequest } from "../../middleware/validation.middleware";
import { ERROR_MESSAGES } from "../../constants";

// Mock request creation helper
const createMockRequest = (data: { body?: any; params?: any; query?: any }): Request => {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
  } as unknown as Request;
};

describe("Validation Middleware", () => {
  describe("validateRequest", () => {
    // Mock schema that validates body, params, and query
    const testSchema = z.object({
      body: z.object({
        name: z.string({
          required_error: ERROR_MESSAGES.REQUIRED_FIELD,
        }),
      }),
      params: z.object({
        id: z.string({
          required_error: ERROR_MESSAGES.REQUIRED_FIELD,
        }),
      }),
      query: z.object({
        filter: z.string().optional(),
      }),
    });

    it("should pass validation when all required fields are present", () => {
      const mockReq = createMockRequest({
        body: { name: "test" },
        params: { id: "123" },
        query: {},
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      validateRequest(testSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should return 400 when body validation fails", () => {
      const mockReq = createMockRequest({
        body: {},
        params: { id: "123" },
        query: {},
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      validateRequest(testSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: ERROR_MESSAGES.REQUIRED_FIELD,
          details: expect.any(Array),
        }),
      );
    });

    it("should return 400 when params validation fails", () => {
      const mockReq = createMockRequest({
        body: { name: "test" },
        params: {},
        query: {},
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      validateRequest(testSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: ERROR_MESSAGES.REQUIRED_FIELD,
          details: expect.any(Array),
        }),
      );
    });

    it("should pass validation with optional query params", () => {
      const mockReq = createMockRequest({
        body: { name: "test" },
        params: { id: "123" },
        query: { filter: "active" },
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      validateRequest(testSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should return 400 with invalid_type error details", () => {
      const mockReq = createMockRequest({
        body: { name: 123 }, // number instead of string
        params: { id: "123" },
        query: {},
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      validateRequest(testSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              code: "invalid_type",
              expected: "string",
              received: "number",
            }),
          ]),
        }),
      );
    });

    it("should return standardized error for non-Zod errors", () => {
      const mockReq = createMockRequest({
        body: { name: "test" },
        params: { id: "123" },
        query: {},
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      // Create a schema that will throw a non-Zod error
      const badSchema = {
        parse: () => {
          throw new Error("Some other error");
        },
      } as unknown as z.ZodType;

      validateRequest(badSchema)(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: ERROR_MESSAGES.INVALID_REQUEST,
        }),
      );
    });
  });
});
