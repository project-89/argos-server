import { Timestamp } from "firebase-admin/firestore";

// Enums from HIVEMIND_TYPES.md
export enum SkillLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
  Expert = "Expert",
}

export enum SpecializationType {
  Development = "Development",
  Design = "Design",
  Research = "Research",
  Security = "Security",
  Community = "Community",
  Content = "Content",
  Other = "Other",
}

// Database model (what we store in Firestore)
export interface CapabilityModel {
  id: string;
  profileId: string;
  name: string;
  level: SkillLevel;
  type: SpecializationType;
  isVerified: boolean;
  verifiedAt?: Timestamp;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// API response (what we send to clients)
export interface Capability {
  id: string;
  profileId: string;
  name: string;
  level: SkillLevel;
  type: SpecializationType;
  isVerified: boolean;
  verifiedAt?: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// Type alias for API response
export type CapabilityResponse = Capability;

// Input types
export interface CreateCapabilityInput {
  name: string;
  level: SkillLevel;
  type: SpecializationType;
  description?: string;
}

export interface UpdateCapabilityInput {
  name?: string;
  level?: SkillLevel;
  type?: SpecializationType;
  description?: string;
}
