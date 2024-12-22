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
        return sendError(res, firstError.message, 400, error.errors);
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
        return sendError(res, firstError.message, 400, error.errors);
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
        return sendError(res, firstError.message, 400, error.errors);
      }
      return sendError(res, "Invalid path parameters", 400);
    }
  };
};
