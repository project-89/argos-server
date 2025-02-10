import { Express, Request } from "express";
import express from "express";
import path from "path";
import { ApiError, sendError } from "../../utils";
import { ERROR_MESSAGES } from "../http/errors";

// Helper to check if request is from a browser
const isBrowserRequest = (req: Request): boolean => {
  const accept = req.headers.accept || "";
  return accept.includes("text/html") || accept.includes("*/*");
};

export const configureAPI = (app: Express): void => {
  // Body parser
  app.use(express.json());

  // Landing page handler
  app.get("/", (req, res) => {
    if (isBrowserRequest(req)) {
      res.sendFile(path.join(__dirname, "../../public", "index.html"));
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
      res.status(404).sendFile(path.join(__dirname, "../../public", "404.html"));
    } else {
      sendError(res, new ApiError(404, ERROR_MESSAGES.NOT_FOUND));
    }
  });
};
