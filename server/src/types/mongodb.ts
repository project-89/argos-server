import { Filter, ObjectId } from "mongodb";

/**
 * MongoDB ID Filter
 * Used for queries that search by _id
 */
export type MongoIdFilter = { _id: ObjectId };

/**
 * MongoDB Field Filter
 * Used for queries that search by a specific field
 */
export type MongoFieldFilter<T> = { [K in keyof T]?: T[K] | { $in: T[K][] } | { $nin: T[K][] } };

/**
 * MongoDB Date Range Filter
 * Used for date range queries
 */
export type MongoDateRangeFilter = {
  [key: string]: {
    $gte?: Date;
    $lte?: Date;
  };
};

/**
 * MongoDB Text Search Filter
 * Used for full-text search queries
 */
export type MongoTextSearchFilter = {
  $text: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
};

/**
 * MongoDB Exists Filter
 * Used to check if a field exists
 */
export type MongoExistsFilter = {
  [key: string]: {
    $exists: boolean;
  };
};

/**
 * MongoDB Query Type
 * Combines all filter types for use with MongoDB queries
 */
export type MongoQuery<T> =
  | MongoIdFilter
  | MongoFieldFilter<T>
  | MongoDateRangeFilter
  | MongoTextSearchFilter
  | MongoExistsFilter
  | Filter<T>;

/**
 * MongoDB Update Type
 * Represents a MongoDB update operation
 */
export type MongoUpdate<T> = {
  $set?: Partial<T>;
  $unset?: { [K in keyof T]?: "" };
  $inc?: { [K in keyof T]?: number };
  $push?: { [K in keyof T]?: any };
  $pull?: { [K in keyof T]?: any };
  $addToSet?: { [K in keyof T]?: any };
  [key: string]: any;
};

/**
 * MongoDB Document Type
 * Basic MongoDB document type with _id field
 */
export type MongoDocument = {
  _id: ObjectId;
  [key: string]: any;
};
