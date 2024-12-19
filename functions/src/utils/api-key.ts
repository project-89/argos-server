import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Use environment variable for encryption key
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || randomBytes(32);
const ENCRYPTION_IV = process.env.API_KEY_ENCRYPTION_IV || randomBytes(16);

/**
 * Generates a secure API key using cryptographic random bytes
 * @returns A base64 encoded string without URL-unsafe characters
 */
export const generateApiKey = (): string => {
  const bytes = randomBytes(32);
  return bytes.toString("base64").replace(/[+/=]/g, "");
};

/**
 * Encrypts an API key for client storage
 * @param apiKey Plain API key
 * @returns Encrypted API key safe for client storage
 */
export const encryptApiKey = (apiKey: string): string => {
  const cipher = createCipheriv("aes-256-cbc", ENCRYPTION_KEY, ENCRYPTION_IV);
  let encrypted = cipher.update(apiKey, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};

/**
 * Decrypts an API key from client storage
 * @param encryptedKey Encrypted API key from client
 * @returns Original API key
 */
export const decryptApiKey = (encryptedKey: string): string => {
  const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, ENCRYPTION_IV);
  let decrypted = decipher.update(encryptedKey, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
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
