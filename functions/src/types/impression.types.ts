/**
 * Impression Types
 * Contains types for tracking and managing user impressions
 */

import type { Impression as ImpressionModel } from "./models.types";

/**
 * Impression Management
 */
export interface CreateImpressionRequest
  extends Omit<ImpressionModel, "timestamp" | "createdAt" | "id"> {}

export interface GetImpressionsQuery {
  type?: string;
  startTime?: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  limit?: number;
  sessionId?: string;
}

export interface DeleteImpressionsQuery extends GetImpressionsQuery {}
