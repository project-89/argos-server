import { Timestamp } from "firebase-admin/firestore";

/**
 * Converts a Firestore Timestamp to Unix timestamp (milliseconds)
 */
export const toUnixMillis = (timestamp: Timestamp): number => {
  return timestamp.toMillis();
};

/**
 * Converts Unix timestamp (milliseconds) to Firestore Timestamp
 */
export const toFirestoreTimestamp = (unixMillis: number): Timestamp => {
  return Timestamp.fromMillis(unixMillis);
};

/**
 * Converts a Date object to Firestore Timestamp
 */
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Converts an ISO date string to Firestore Timestamp
 */
export const isoToTimestamp = (isoString: string): Timestamp => {
  return Timestamp.fromDate(new Date(isoString));
};

/**
 * Converts a Firestore Timestamp to ISO string
 */
export const timestampToIso = (timestamp: Timestamp): string => {
  return timestamp.toDate().toISOString();
};

/**
 * Gets current time as Firestore Timestamp
 */
export const getCurrentTimestamp = (): Timestamp => {
  return Timestamp.now();
};

/**
 * Gets current time as Unix timestamp (milliseconds)
 */
export const getCurrentUnixMillis = (): number => {
  return Date.now();
};

/**
 * Validates if a value is a valid Unix timestamp (milliseconds)
 */
export const isValidUnixMillis = (value: any): boolean => {
  return (
    typeof value === "number" && Number.isInteger(value) && value > 0 && value <= Date.now() + 60000 // Not more than 1 minute in the future
  );
};

/**
 * Validates if a value is a valid Firestore Timestamp
 */
export const isValidFirestoreTimestamp = (value: any): boolean => {
  return (
    value instanceof Timestamp && value.toMillis() > 0 && value.toMillis() <= Date.now() + 60000 // Not more than 1 minute in the future
  );
};

/**
 * Type guard for Firestore Timestamp
 */
export const isFirestoreTimestamp = (value: any): value is Timestamp => {
  return value instanceof Timestamp;
};
