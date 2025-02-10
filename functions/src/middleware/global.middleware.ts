import { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { CORS_CONFIG } from "../constants/config/cors";

export const configureCORS = (app: Express): void => {
  // Debug log CORS configuration
  const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
  console.log("[CORS] Allowed origins:", allowedOrigins);
  console.log("[CORS] Options:", CORS_CONFIG.options);

  // Add explicit OPTIONS handler for preflight requests FIRST
  app.options(
    "*",
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, origin || "*");
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      ...CORS_CONFIG.options,
    }),
  );

  // Apply CORS middleware for all other requests
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, "*");
          return;
        }

        const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
        if (allowedOrigins.includes(origin)) {
          callback(null, origin);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      ...CORS_CONFIG.options,
    }),
  );
};

// CORS error handling middleware
export const corsErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  if (err.message === "Not allowed by CORS") {
    console.error("[CORS Error]", err.message);
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Not allowed by CORS",
    });
  }
  next(err);
};
