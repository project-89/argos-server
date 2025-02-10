import { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import express from "express";
import { CORS_CONFIG } from "../constants";
import { MiddlewareConfig } from "./config.middleware";
import { withMetrics, ipRateLimit } from ".";
import { ApiError, sendError } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import path from "path";

// Helper to check if request is from a browser
const isBrowserRequest = (req: Request): boolean => {
  const accept = req.headers.accept || "";
  return accept.includes("text/html") || accept.includes("*/*");
};

export const setupMiddleware = (app: Express) => {
  // Debug log CORS configuration
  const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
  console.log("[CORS] Allowed origins:", allowedOrigins);
  console.log("[CORS] Options:", CORS_CONFIG.options);

  // Add explicit OPTIONS handler for preflight requests FIRST
  app.options(
    "*",
    cors({
      origin: (origin, callback) => {
        console.log("[CORS] Preflight request from origin:", origin);
        const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, origin || "*");
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: [...CORS_CONFIG.options.methods],
      allowedHeaders: [...CORS_CONFIG.options.allowedHeaders],
      exposedHeaders: [...CORS_CONFIG.options.exposedHeaders],
      maxAge: CORS_CONFIG.options.maxAge,
    }),
  );

  // Apply CORS middleware for all other requests
  app.use(
    cors({
      origin: (origin, callback) => {
        console.log("[CORS] Request from origin:", origin);
        if (!origin) {
          console.log("[CORS] Request without origin - allowing for non-credentialed requests");
          callback(null, "*");
          return;
        }

        const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
        console.log("[CORS] Checking origin against allowed list:", { origin, allowedOrigins });

        if (allowedOrigins.includes(origin)) {
          console.log("[CORS] Origin allowed:", origin);
          callback(null, origin);
        } else {
          console.error(`[CORS] Blocked request from unauthorized origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: [...CORS_CONFIG.options.methods],
      allowedHeaders: [...CORS_CONFIG.options.allowedHeaders],
      exposedHeaders: [...CORS_CONFIG.options.exposedHeaders],
      maxAge: CORS_CONFIG.options.maxAge,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }),
  );

  // Body parser
  app.use(express.json());

  // Initialize middleware configuration
  const middlewareConfig = MiddlewareConfig.getInstance();

  // Configure rate limits
  middlewareConfig.set("rateLimit.ip", {
    windowMs: 60 * 60 * 1000,
    max: process.env.IP_RATE_LIMIT_MAX ? parseInt(process.env.IP_RATE_LIMIT_MAX) : 300,
  });

  middlewareConfig.set("rateLimit.fingerprint", {
    windowMs: 60 * 60 * 1000,
    max: process.env.FINGERPRINT_RATE_LIMIT_MAX
      ? parseInt(process.env.FINGERPRINT_RATE_LIMIT_MAX)
      : 1000,
  });

  middlewareConfig.set("rateLimit.health", {
    windowMs: 60 * 1000,
    max: 60,
  });

  // Health check rate limiting
  const healthMiddleware = withMetrics(
    ipRateLimit(middlewareConfig.get("rateLimit.health")),
    "healthIpRateLimit",
  );

  // Apply health check rate limiting
  app.use("/health", healthMiddleware);
  app.use("/metrics", healthMiddleware);

  // CORS error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction): Response | void => {
    if (err.message === "Not allowed by CORS") {
      console.error("[CORS Error]", err.message);
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Not allowed by CORS",
      });
    }
    next(err);
  });

  // Landing page handler
  app.get("/", (req, res) => {
    if (isBrowserRequest(req)) {
      res.sendFile(path.join(__dirname, "../public", "index.html"));
    } else {
      res.json({
        name: "Argos API",
        version: "1.0.0",
        status: "operational",
        documentation: "Visit https://argos.project89.org in a browser for documentation",
      });
    }
  });

  // 404 handler
  app.use((req, res) => {
    if (isBrowserRequest(req)) {
      res.status(404).sendFile(path.join(__dirname, "../public", "404.html"));
    } else {
      sendError(res, new ApiError(404, ERROR_MESSAGES.NOT_FOUND));
    }
  });
};
