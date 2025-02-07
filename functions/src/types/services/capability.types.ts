import { Timestamp } from "firebase-admin/firestore";

// Enums
export enum SkillLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
  Expert = "Expert",
}

// Base skill definition (shared across users)
export interface Skill {
  id: string;
  name: string;
  type: string;
  category?: string;
  description?: string;
  keywords?: string[];
  aliases?: string[];
  parentType?: string;
  useCount: number;
  createdAt: number;
  updatedAt: number;
}

// Database model for skills
export interface SkillModel {
  id: string;
  name: string;
  type: string;
  category?: string;
  description?: string;
  keywords?: string[];
  aliases?: string[];
  parentType?: string;
  useCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Profile's capability (links profile to skill with additional data)
export interface ProfileCapability {
  id: string;
  profileId: string;
  skillId: string;
  level: SkillLevel;
  isVerified: boolean;
  verifiedAt?: number;
  verifierId?: string;
  createdAt: number;
  updatedAt: number;
}

// Database model for profile capabilities
export interface ProfileCapabilityModel {
  id: string;
  profileId: string;
  skillId: string;
  level: SkillLevel;
  isVerified: boolean;
  verifiedAt?: Timestamp;
  verifierId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Input types
export interface CreateCapabilityInput {
  name: string;
  level: SkillLevel;
  type?: string;
  description?: string;
  aliases?: string[];
  keywords?: string[];
  category?: string;
  parentType?: string;
}

export interface UpdateCapabilityInput {
  name?: string;
  level?: SkillLevel;
  type?: string;
  description?: string;
  aliases?: string[];
  keywords?: string[];
  category?: string;
  parentType?: string;
}

// Skill matching types
export interface AnalyzeSkillInput {
  description: string;
}

export interface SkillMatch {
  skill: Skill;
  confidence: number;
  matchedOn: {
    name?: boolean;
    aliases?: boolean;
    keywords?: boolean;
    category?: boolean;
  };
}

export interface AnalyzeSkillResponse {
  matches: SkillMatch[];
  suggestedType?: string;
  suggestedCategory?: string;
  extractedKeywords?: string[];
  parentType?: string;
}

// For autocomplete
export interface SearchCapabilitiesInput {
  query: string;
  type?: string;
  category?: string;
  parentType?: string;
  limit?: number;
}

// For managing skill types
export interface SkillType {
  id: string;
  name: string;
  parentType?: string;
  description?: string;
  useCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSkillTypeInput {
  name: string;
  parentType?: string;
  description?: string;
}
