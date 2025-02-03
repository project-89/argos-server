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
