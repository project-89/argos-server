/**
 * Impression Types
 * Contains types for tracking and managing user impressions
 */

import { Timestamp } from "firebase-admin/firestore";
import type { Impression as ImpressionModel } from "./models";

/**
 * Impression Management
 */
export interface CreateImpressionRequest {
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  source?: string;
  sessionId?: string;
}

export interface ImpressionResponse extends Omit<ImpressionModel, "createdAt"> {
  createdAt: number; // Unix timestamp for API response
}

export interface GetImpressionsQuery {
  type?: string;
  startTime?: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  limit?: number;
  sessionId?: string;
}

export interface DeleteImpressionsQuery extends GetImpressionsQuery {}

export interface ImpressionDocument {
  id: string;
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  source?: string;
  sessionId?: string;
  createdAt: Timestamp;
}

/**
 * Impression Endpoints
 */
export const IMPRESSION_ENDPOINTS = {
  CREATE_IMPRESSION: "/impressions",
  GET_IMPRESSIONS: "/impressions/:fingerprintId",
  DELETE_IMPRESSIONS: "/impressions/:fingerprintId",
} as const;
