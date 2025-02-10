import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import * as functions from "firebase-functions";

// Use Firebase Functions config for encryption keys
const getEncryptionKey = () => {
  // Use test environment variables if in test mode
  if (process.env.NODE_ENV === "test") {
    const key = process.env.FIREBASE_CONFIG_ENCRYPTION_API_KEY || "";
    console.log("Using test encryption key (base64):", key);
    const buffer = Buffer.from(key, "base64");
    console.log("Test encryption key (buffer length):", buffer.length);
    return buffer;
  }

  // Use Firebase Functions config in production
  const config = functions.config();
  const key = config.encryption?.api_key || "";
  console.log("Encryption key (base64):", key);
  const buffer = Buffer.from(key, "base64");
  console.log("Encryption key (buffer length):", buffer.length);
  return buffer;
};

const getEncryptionIv = () => {
  // Use test environment variables if in test mode
  if (process.env.NODE_ENV === "test") {
    const iv = process.env.FIREBASE_CONFIG_ENCRYPTION_API_IV || "";
    console.log("Using test encryption IV (base64):", iv);
    const buffer = Buffer.from(iv, "base64");
    console.log("Test encryption IV (buffer length):", buffer.length);
    return buffer;
  }

  // Use Firebase Functions config in production
  const config = functions.config();
  const iv = config.encryption?.api_iv || "";
  console.log("Encryption IV (base64):", iv);
  const buffer = Buffer.from(iv, "base64");
  console.log("Encryption IV (buffer length):", buffer.length);
  return buffer;
};

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
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), getEncryptionIv());
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
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), getEncryptionIv());
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
