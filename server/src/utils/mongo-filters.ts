/**
 * MongoDB Filter Utilities
 *
 * This file contains helper functions for working with MongoDB filters,
 * particularly for handling ObjectId conversions safely to avoid type errors.
 */

import { ObjectId, Filter } from "mongodb";

/**
 * Safely check if a string is a valid ObjectId
 * @param id ID to check
 * @returns Whether the ID is a valid ObjectId
 */
export function isValidObjectId(id: string | ObjectId | null | undefined): boolean {
  if (!id) return false;

  try {
    return ObjectId.isValid(id.toString());
  } catch (error) {
    return false;
  }
}

/**
 * Create a MongoDB filter by ID
 * Type-safe and handles invalid IDs gracefully
 *
 * @param id ID to filter by
 * @returns MongoDB filter object or empty object if invalid
 */
export function idFilter(id: string | ObjectId | null | undefined): Filter<any> {
  if (!id) return {};

  try {
    return { _id: new ObjectId(id.toString()) };
  } catch (error) {
    console.error(`[MongoDB Filters] Failed to create ObjectId filter from ${id}:`, error);
    return {};
  }
}

/**
 * Create a MongoDB filter by string ID field (not _id)
 * Useful for fields that store string IDs rather than ObjectIds
 *
 * @param field Field name
 * @param id ID value
 * @returns MongoDB filter object
 */
export function stringIdFilter(field: string, id: string): Filter<any> {
  if (!id || !field) return {};
  return { [field]: id };
}

/**
 * Create a MongoDB filter by ID with additional conditions
 *
 * @param id ID to filter by
 * @param conditions Additional filter conditions
 * @returns MongoDB filter with combined conditions
 */
export function idFilterWithConditions(
  id: string | ObjectId | null | undefined,
  conditions: Record<string, any> = {},
): Filter<any> {
  const baseFilter = idFilter(id);
  // If base filter is empty (invalid ID), return empty filter
  if (!Object.keys(baseFilter).length) return {};

  return { ...baseFilter, ...conditions };
}

/**
 * Create a MongoDB filter for not equal to ID
 *
 * @param id ID to exclude
 * @returns MongoDB filter for not equal to ID
 */
export function notEqualIdFilter(id: string | ObjectId | null | undefined): Filter<any> {
  if (!id) return {};

  try {
    const objectId = new ObjectId(id.toString());
    return { _id: { $ne: objectId } };
  } catch (error) {
    console.error(`[MongoDB Filters] Failed to create not-equal ObjectId filter:`, error);
    return {};
  }
}

/**
 * Create a MongoDB filter for a field that contains an ObjectId
 *
 * @param field Field name
 * @param id ID value
 * @returns MongoDB filter for field with ObjectId
 */
export function fieldObjectIdFilter(
  field: string,
  id: string | ObjectId | null | undefined,
): Filter<any> {
  if (!id || !field) return {};

  try {
    const objectId = new ObjectId(id.toString());
    return { [field]: objectId };
  } catch (error) {
    console.error(`[MongoDB Filters] Failed to create field ObjectId filter:`, error);
    return {};
  }
}

/**
 * Create a MongoDB filter for an array field that contains an ObjectId
 *
 * @param field Field name (array field)
 * @param id ID to find in array
 * @returns MongoDB filter for array containing ObjectId
 */
export function arrayContainsIdFilter(
  field: string,
  id: string | ObjectId | null | undefined,
): Filter<any> {
  if (!id || !field) return {};

  try {
    const objectId = new ObjectId(id.toString());
    return { [field]: { $in: [objectId] } };
  } catch (error) {
    console.error(`[MongoDB Filters] Failed to create array contains ObjectId filter:`, error);
    return {};
  }
}

/**
 * Create a MongoDB filter for multiple possible IDs ($in operator)
 *
 * @param ids Array of IDs
 * @returns MongoDB filter for _id in array
 */
export function idsFilter(ids: (string | ObjectId)[]): Filter<any> {
  if (!ids || !ids.length) return {};

  try {
    const objectIds = ids
      .filter((id) => id && isValidObjectId(id))
      .map((id) => new ObjectId(id.toString()));

    if (!objectIds.length) return {};

    return { _id: { $in: objectIds } };
  } catch (error) {
    console.error(`[MongoDB Filters] Failed to create IDs filter:`, error);
    return {};
  }
}

/**
 * Create a MongoDB filter for a date range
 *
 * @param field Field name
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive)
 * @returns MongoDB filter for date range
 */
export function dateRangeFilter(
  field: string,
  startDate?: Date | number | string | null,
  endDate?: Date | number | string | null,
): Filter<any> {
  if (!field) return {};

  const conditions: Record<string, any> = {};

  if (startDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    conditions[`${field}.$gte`] = start;
  }

  if (endDate) {
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    conditions[`${field}.$lte`] = end;
  }

  return Object.keys(conditions).length ? conditions : {};
}

/**
 * Create a MongoDB text search filter
 *
 * @param searchText Text to search for
 * @param language Optional language for text search
 * @returns MongoDB text search filter
 */
export function textSearchFilter(searchText: string, language?: string): Filter<any> {
  if (!searchText) return {};

  // Define the text search interface with optional properties
  const textSearch: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  } = {
    $search: searchText,
  };

  if (language) {
    textSearch.$language = language;
  }

  return {
    $text: textSearch,
  };
}

export default {
  idFilter,
  stringIdFilter,
  idFilterWithConditions,
  isValidObjectId,
  notEqualIdFilter,
  fieldObjectIdFilter,
  arrayContainsIdFilter,
  idsFilter,
  dateRangeFilter,
  textSearchFilter,
};
