import { ObjectId } from "mongodb";
import {
  MongoIdFilter,
  MongoFieldFilter,
  MongoTextSearchFilter,
  MongoExistsFilter,
  MongoDateRangeFilter,
  MongoQuery,
} from "../types/mongodb";
import { idFilter } from "./mongo-filters";

/**
 * Creates a MongoDB query for finding a document by ID
 * Handles converting string IDs to MongoDB ObjectIds
 * @param id The document ID (string or ObjectId)
 * @returns A MongoDB filter object
 */
export function createIdFilter(id: string | ObjectId): MongoIdFilter | null {
  const filter = idFilter(id);
  if (!Object.keys(filter).length) return null;
  return filter as MongoIdFilter;
}

/**
 * Creates a MongoDB query with basic filters
 * Handles ObjectId conversions, empty values, etc.
 * @param filters Object with filter conditions
 * @returns MongoDB query object
 */
export function createMongoQuery<T>(filters: Record<string, any>): MongoFieldFilter<T> {
  const query: Record<string, any> = {};

  // Process each filter key
  Object.entries(filters).forEach(([key, value]) => {
    // Skip undefined, null, or empty string values
    if (value === undefined || value === null || value === "") {
      return;
    }

    // Handle ID fields that need ObjectId conversion
    if (key === "id" || key.endsWith("Id")) {
      if (key === "id") {
        try {
          // Directly create ObjectId with safe error handling
          query._id = new ObjectId(String(value));
        } catch (error) {
          console.warn(`Invalid ObjectId format for id: ${value}`);
          // Skip this filter if ID is invalid
        }
      } else {
        try {
          // Directly create ObjectId with safe error handling
          query[key] = new ObjectId(String(value));
        } catch (error) {
          console.warn(`Invalid ObjectId format for ${key}: ${value}`);
          // Use the original string value as fallback
          query[key] = value;
        }
      }
    } else {
      // Regular field, no conversion needed
      query[key] = value;
    }
  });

  return query as MongoFieldFilter<T>;
}

/**
 * Creates a MongoDB query for checking if a document exists
 * @param field The field to check for existence
 * @returns MongoDB exists query
 */
export function createExistsQuery(field: string): MongoExistsFilter {
  return { [field]: { $exists: true } };
}

/**
 * Creates a MongoDB query for text search
 * @param searchText Text to search for
 * @returns MongoDB text search query
 */
export function createTextSearchQuery(searchText: string): MongoTextSearchFilter {
  return { $text: { $search: searchText } };
}

/**
 * Creates a MongoDB query for date range
 * @param field Field name to query
 * @param startDate Start date (optional)
 * @param endDate End date (optional)
 * @returns MongoDB date range query
 */
export function createDateRangeQuery(
  field: string,
  startDate?: Date | number | string,
  endDate?: Date | number | string,
): MongoDateRangeFilter | null {
  const rangeQuery: { $gte?: Date; $lte?: Date } = {};

  if (startDate) {
    rangeQuery.$gte = new Date(startDate);
  }

  if (endDate) {
    rangeQuery.$lte = new Date(endDate);
  }

  return Object.keys(rangeQuery).length > 0 ? { [field]: rangeQuery } : null;
}
