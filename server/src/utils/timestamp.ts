/**
 * Utility functions for timestamp handling
 */

/**
 * Convert a timestamp to milliseconds
 * @param timestamp Timestamp in Date, number, or string format
 * @returns Milliseconds since epoch
 */
export function toMillis(timestamp: Date | number | string | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined) return null;

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (typeof timestamp === "string") {
    try {
      return new Date(timestamp).getTime();
    } catch (error) {
      console.error(`Invalid timestamp string: ${timestamp}`);
      return null;
    }
  }

  return null;
}

/**
 * Convert any timestamp format to a Date object
 * @param timestamp Timestamp in Date, number (milliseconds), or string format
 * @returns Date object
 */
export function toDate(timestamp: Date | number | string | null | undefined): Date | null {
  if (timestamp === null || timestamp === undefined) return null;

  if (timestamp instanceof Date) {
    return timestamp;
  }

  try {
    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }

    if (typeof timestamp === "string") {
      return new Date(timestamp);
    }
  } catch (error) {
    console.error(`Failed to convert timestamp to Date: ${timestamp}`);
  }

  return null;
}

/**
 * Get the current timestamp in milliseconds
 * @returns Current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Format a Date object to ISO string
 * @param date Date object or timestamp
 * @returns ISO formatted date string
 */
export function formatDate(date: Date | number | string | null | undefined): string | null {
  const dateObject = toDate(date);
  return dateObject ? dateObject.toISOString() : null;
}

/**
 * Helper function to ensure a consistent Date object for MongoDB
 * @param timestamp Timestamp in any format
 * @returns Date object suitable for MongoDB storage
 */
export function toMongoDate(timestamp: Date | number | string | null | undefined): Date | null {
  return toDate(timestamp);
}

/**
 * Get the current timestamp in milliseconds since epoch
 * This is a compat function for code that was calling getCurrentUnixMillis
 * @returns Current timestamp in milliseconds
 */
export function getCurrentUnixMillis(): number {
  return Date.now();
}

export default {
  toMillis,
  toDate,
  now,
  formatDate,
  toMongoDate,
  getCurrentUnixMillis,
};
