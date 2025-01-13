import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendError } from "../utils/response";

export const validateRequest = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      schema.parse(req.body);
      next();
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const details = error.errors.map((err) => {
          const detail: {
            code: string;
            path: (string | number)[];
            message: string;
            expected?: string;
            received?: string;
          } = {
            code: err.code,
            path: err.path,
            message: err.message,
          };

          if (err.code === "invalid_type") {
            detail.expected = err.expected as string;
            detail.received = err.received as string;
          }

          return detail;
        });

        return sendError(res, firstError.message, 400, { details });
      }
      return sendError(res, "Invalid request data", 400);
    }
  };
};

export const validateQuery = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      schema.parse(req.query);
      next();
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return sendError(res, firstError.message, 400, {
          details: error.errors.map((err) => ({
            code: err.code,
            path: err.path,
            message: err.message,
          })),
        });
      }
      return sendError(res, "Invalid query parameters", 400);
    }
  };
};

export const validateParams = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      schema.parse(req.params);
      next();
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return sendError(res, firstError.message, 400, {
          details: error.errors.map((err) => ({
            code: err.code,
            path: err.path,
            message: err.message,
          })),
        });
      }
      return sendError(res, "Invalid path parameters", 400);
    }
  };
};
