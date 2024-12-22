import { Response } from "express";
import { sendSuccess, sendError, sendWarning, ApiResponse } from "../../utils/response";
import { ApiError } from "../../utils/error";

// Mock Express Response
const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe("Response Utilities", () => {
  describe("sendSuccess", () => {
    it("should create a properly formatted success response", () => {
      const res = mockResponse();
      const data = { foo: "bar" };

      sendSuccess(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;

      expect(response).toMatchObject({
        success: true,
        data,
      });
      expect(response.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(new Date(response.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should handle message-only data correctly", () => {
      const res = mockResponse();
      const data = { message: "Success message" };

      sendSuccess(res, data);

      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;
      expect(response.data).toBeUndefined();
      expect(response.message).toBe("Success message");
    });
  });

  describe("sendError", () => {
    it("should create a properly formatted error response", () => {
      const res = mockResponse();
      const error = new Error("Test error");

      sendError(res, error);

      expect(res.status).toHaveBeenCalledWith(500);
      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;

      expect(response).toMatchObject({
        success: false,
        error: "Test error",
      });
      expect(response.requestId).toBeTruthy();
      expect(response.timestamp).toBeTruthy();
    });

    it("should handle ApiError status codes", () => {
      const res = mockResponse();
      const error = new ApiError(403, "Not authorized");

      sendError(res, error);

      expect(res.status).toHaveBeenCalledWith(403);
      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;
      expect(response.error).toBe("Not authorized");
    });

    it("should standardize common error messages", () => {
      const res = mockResponse();

      sendError(res, "API key not found", 401);

      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;
      expect(response.error).toBe("Invalid API key");
    });
  });

  describe("sendWarning", () => {
    it("should create a properly formatted warning response", () => {
      const res = mockResponse();
      const data = { foo: "bar" };
      const warning = "Warning message";

      sendWarning(res, data, warning);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as jest.Mock).mock.calls[0][0] as ApiResponse;

      expect(response).toMatchObject({
        success: true,
        data,
        message: warning,
      });
      expect(response.requestId).toBeTruthy();
      expect(response.timestamp).toBeTruthy();
    });
  });
});
