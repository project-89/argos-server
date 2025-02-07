import { Timestamp } from "firebase-admin/firestore";
import { Stats } from "./stats.types";

export interface ContactInfo {
  email?: string;
  discord?: string;
  twitter?: string;
  github?: string;
}

export interface ProfilePreferences {
  isProfilePublic?: boolean;
  showStats?: boolean;
}

// Database model (what's stored in Firestore)
export interface ProfileModel {
  id: string;
  walletAddress: string;
  fingerprintId: string;
  username: string;
  bio: string;
  avatarUrl: string;
  contactInfo: {
    email?: string;
    discord?: string;
    [key: string]: string | undefined;
  };
  preferences: {
    isProfilePublic: boolean;
    showStats: boolean;
  };
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

// API response (what's returned to clients)
export interface Profile {
  id: string;
  walletAddress: string;
  fingerprintId: string;
  username: string;
  bio: string;
  avatarUrl: string;
  contactInfo: {
    email?: string;
    discord?: string;
    [key: string]: string | undefined;
  };
  preferences: {
    isProfilePublic: boolean;
    showStats: boolean;
  };
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export interface ProfileWithStats extends Profile {
  stats: Stats | null;
}

export interface CreateProfileInput {
  walletAddress: string;
  fingerprintId: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  contactInfo?: {
    email?: string;
    discord?: string;
    [key: string]: string | undefined;
  };
  preferences?: {
    isProfilePublic?: boolean;
    showStats?: boolean;
  };
}

export interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  contactInfo?: {
    email?: string;
    discord?: string;
    [key: string]: string | undefined;
  };
  preferences?: {
    isProfilePublic?: boolean;
    showStats?: boolean;
  };
}
