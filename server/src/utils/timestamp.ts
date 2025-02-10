import { Timestamp } from "firebase-admin/firestore";

/**
 * Converts a Firestore Timestamp to Unix timestamp (milliseconds)
 */
export const toUnixMillis = (timestamp: Timestamp): number => {
  return timestamp.toMillis();
};

/**
 * Gets current time as Unix timestamp (milliseconds)
 */
export const getCurrentUnixMillis = (): number => {
  return Date.now();
};

/**
 * Validates if a value is a valid Firestore Timestamp
 */
export const isValidFirestoreTimestamp = (value: any): boolean => {
  return (
    value instanceof Timestamp && value.toMillis() > 0 && value.toMillis() <= Date.now() + 60000 // Not more than 1 minute in the future
  );
};
