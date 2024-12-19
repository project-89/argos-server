import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateRequest = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      schema.parse(req.body);
      next();
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({
          success: false,
          error: firstError.message,
          details: error.errors,
        });
      }
      return res.status(400).json({
        success: false,
        error: "Invalid request data",
      });
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
        return res.status(400).json({
          success: false,
          error: firstError.message,
          details: error.errors,
        });
      }
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
      });
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
        return res.status(400).json({
          success: false,
          error: firstError.message,
          details: error.errors,
        });
      }
      return res.status(400).json({
        success: false,
        error: "Invalid path parameters",
      });
    }
  };
};
