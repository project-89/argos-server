import { randomBytes } from "crypto";

/**
 * Generates a secure API key using cryptographic random bytes
 * @returns A base64 encoded string without URL-unsafe characters
 */
export const generateApiKey = (): string => {
  const bytes = randomBytes(32);
  return bytes.toString("base64").replace(/[+/=]/g, "");
};

/**
 * Validates an API key format
 * @param key The API key to validate
 * @returns boolean indicating if the key format is valid
 */
export const isValidApiKeyFormat = (key: string): boolean => {
  if (!key || typeof key !== "string") return false;
  return /^[A-Za-z0-9\-_]{32,}$/.test(key);
};
