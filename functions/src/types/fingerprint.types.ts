/**
 * Fingerprint Types
 * Contains types for fingerprint data and management
 */

import { Timestamp } from "firebase-admin/firestore";
import { TagData, TagLimitData } from "./tag.types";

/**
 * Fingerprint Data
 */
export interface FingerprintData {
  id: string;
  fingerprint: string;
  tags?: Record<string, TagData>;
  tagLimits?: TagLimitData;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActive: Timestamp;
}

export interface FingerprintResponse
  extends Omit<FingerprintData, "createdAt" | "updatedAt" | "lastActive" | "tags" | "tagLimits"> {
  createdAt: number; // Unix timestamp for API response
  updatedAt: number; // Unix timestamp for API response
  lastActive: number; // Unix timestamp for API response
  tags?: Record<
    string,
    {
      type: string;
      taggedBy: string;
      taggedAt: number; // Unix timestamp for API response
      createdAt: number; // Unix timestamp for API response
    }
  >;
  tagLimits?: {
    firstTaggedAt: number; // Unix timestamp for API response
    remainingDailyTags: number;
    lastTagResetAt: number; // Unix timestamp for API response
  };
}

/**
 * Fingerprint Endpoints
 */
export const FINGERPRINT_ENDPOINTS = {
  GET_FINGERPRINT: "/fingerprint/:id",
  UPDATE_FINGERPRINT: "/fingerprint/update",
} as const;
