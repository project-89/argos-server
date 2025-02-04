import { Request } from "express";

/**
 * Extracts client IP from request
 */
export const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};

/**
 * Extracts domain from URL
 */
export const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
};
