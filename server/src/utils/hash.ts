import crypto from "crypto";

const SALT_LENGTH = 16; // bytes
const HASH_ITERATIONS = 10000;
const HASH_LENGTH = 64; // bytes
const HASH_ALGORITHM = "sha512";

// Get the application salt from environment
const APP_SALT = process.env.SOCIAL_IDENTITY_SALT;
if (!APP_SALT) {
  throw new Error("SOCIAL_IDENTITY_SALT environment variable is required");
}

interface HashedIdentity {
  hashedUsername: string;
  usernameSalt: string; // This is the per-user salt
}

/**
 * Hash a social identity with both app-wide and user-specific salts
 * @param platform The social platform (e.g., "x", "discord")
 * @param username The username to hash
 * @returns The hashed username and user salt (app salt remains secret)
 */
export const hashSocialIdentity = (platform: string, username: string): HashedIdentity => {
  // Generate user-specific salt
  const usernameSalt = crypto.randomBytes(SALT_LENGTH).toString("hex");

  // Combine app salt and user salt
  const combinedSalt = crypto
    .createHmac(HASH_ALGORITHM, APP_SALT)
    .update(usernameSalt)
    .digest("hex");

  // Hash the identity with both salts
  const hashedUsername = crypto
    .pbkdf2Sync(
      `${platform}:${username.toLowerCase()}`,
      combinedSalt,
      HASH_ITERATIONS,
      HASH_LENGTH,
      HASH_ALGORITHM,
    )
    .toString("hex");

  // Only return the user salt - app salt remains secret
  return { hashedUsername, usernameSalt };
};

/**
 * Verify a social identity against a stored hash
 * @param platform The social platform
 * @param username The username to verify
 * @param storedHashedUsername The stored hashed username to verify against
 * @param storedUsernameSalt The stored user salt
 * @returns boolean indicating if the identity matches
 */
export const verifySocialIdentity = (
  platform: string,
  username: string,
  storedHashedUsername: string,
  storedUsernameSalt: string,
): boolean => {
  // Recreate combined salt
  const combinedSalt = crypto
    .createHmac(HASH_ALGORITHM, APP_SALT)
    .update(storedUsernameSalt)
    .digest("hex");

  // Hash with both salts
  const hashedUsername = crypto
    .pbkdf2Sync(
      `${platform}:${username.toLowerCase()}`,
      combinedSalt,
      HASH_ITERATIONS,
      HASH_LENGTH,
      HASH_ALGORITHM,
    )
    .toString("hex");

  return hashedUsername === storedHashedUsername;
};

/**
 * Generate a deterministic but anonymous display name
 * This allows for consistent display names without revealing the actual username
 * @param hash The hashed identity
 * @returns A consistent display name for the hashed identity
 */
export const generateAnonDisplayName = (hash: string): string => {
  // Use first 8 chars of hash to generate a name
  const nameHash = hash.slice(0, 8);
  return `anon_${nameHash}`;
};
