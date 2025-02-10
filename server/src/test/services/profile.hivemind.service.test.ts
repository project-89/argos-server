import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";
import { cleanDatabase } from "../utils/testUtils";
import { profileService } from "../../services/profile.hivemind.service";

describe("ProfileService", () => {
  const db = getFirestore();
  const testWalletAddress = "0x1234567890123456789012345678901234567890";
  const testFingerprintId = "test-fingerprint-id";

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // Helper function to compare profiles without timestamps and stats
  const compareProfilesWithoutTimestamps = (profile1: any, profile2: any) => {
    const { createdAt: _c1, updatedAt: _u1, stats: _s1, ...rest1 } = profile1;
    const { createdAt: _c2, updatedAt: _u2, stats: _s2, ...rest2 } = profile2;
    expect(rest1).toEqual(rest2);
  };

  describe("createProfile", () => {
    it("should create a new profile", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
        bio: "Test bio",
        avatarUrl: "https://example.com/avatar.png",
        contactInfo: {
          email: "test@example.com",
          discord: "test#1234",
        },
      };

      const profile = await profileService.createProfile(input);

      expect(profile).toMatchObject({
        walletAddress: input.walletAddress,
        fingerprintId: input.fingerprintId,
        username: input.username,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        contactInfo: input.contactInfo,
        preferences: {
          isProfilePublic: true,
          showStats: true,
        },
      });
      expect(profile.id).toBeDefined();
      expect(typeof profile.createdAt).toBe("number");
      expect(typeof profile.updatedAt).toBe("number");
      expect(profile.createdAt).toBe(profile.updatedAt);

      // Verify in database
      const doc = await db.collection(COLLECTIONS.PROFILES).doc(profile.id).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        walletAddress: input.walletAddress,
        username: input.username,
      });
      expect(data?.createdAt).toBeInstanceOf(Timestamp);
      expect(data?.updatedAt).toBeInstanceOf(Timestamp);

      // Verify stats were created
      const statsDoc = await db.collection(COLLECTIONS.STATS).doc(profile.id).get();
      expect(statsDoc.exists).toBe(true);
      const statsData = statsDoc.data();
      expect(statsData).toMatchObject({
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
    });

    it("should throw error if wallet address already has a profile", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      };

      await profileService.createProfile(input);

      await expect(
        profileService.createProfile({
          ...input,
          username: "different",
        }),
      ).rejects.toThrow("Profile already exists for this wallet address");
    });

    it("should throw error if username is taken", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      };

      await profileService.createProfile(input);

      await expect(
        profileService.createProfile({
          walletAddress: "0x0987654321098765432109876543210987654321",
          fingerprintId: "different-fingerprint",
          username: "testuser",
        }),
      ).rejects.toThrow("Username is already taken");
    });
  });

  describe("getProfile", () => {
    it("should get a profile by id", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      };

      const created = await profileService.createProfile(input);
      const profile = await profileService.getProfile(created.id);

      compareProfilesWithoutTimestamps(profile, created);
      expect(typeof profile.createdAt).toBe("number");
      expect(typeof profile.updatedAt).toBe("number");
      expect(profile.createdAt).toBe(created.createdAt);
      expect(profile.updatedAt).toBe(created.updatedAt);
      expect(profile.stats).toBeDefined();
      expect(profile.stats).toMatchObject({
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
    });

    it("should throw error if profile not found", async () => {
      await expect(profileService.getProfile("non-existent-id")).rejects.toThrow(
        "Profile not found",
      );
    });
  });

  describe("getProfileByWallet", () => {
    it("should get a profile by wallet address", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      };

      const created = await profileService.createProfile(input);
      const profile = await profileService.getProfileByWallet(testWalletAddress);

      compareProfilesWithoutTimestamps(profile, created);
      expect(typeof profile.createdAt).toBe("number");
      expect(typeof profile.updatedAt).toBe("number");
      expect(profile.createdAt).toBe(created.createdAt);
      expect(profile.updatedAt).toBe(created.updatedAt);
      expect(profile.stats).toBeDefined();
      expect(profile.stats).toMatchObject({
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
      });
    });

    it("should throw error if profile not found", async () => {
      await expect(profileService.getProfileByWallet(testWalletAddress)).rejects.toThrow(
        "Profile not found for wallet address",
      );
    });
  });

  describe("updateProfile", () => {
    it("should update a profile", async () => {
      const input = {
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      };

      const created = await profileService.createProfile(input);
      const updates = {
        username: "newusername",
        bio: "Updated bio",
        contactInfo: {
          email: "new@example.com",
        },
      };

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updated = await profileService.updateProfile(created.id, updates);

      // Compare non-timestamp fields
      compareProfilesWithoutTimestamps(updated, { ...created, ...updates });

      // Verify timestamps
      expect(typeof updated.createdAt).toBe("number");
      expect(typeof updated.updatedAt).toBe("number");
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      // Verify in database
      const doc = await db.collection(COLLECTIONS.PROFILES).doc(updated.id).get();
      const data = doc.data();
      expect(data?.username).toBe(updates.username);
      expect(data?.bio).toBe(updates.bio);
      expect(data?.contactInfo).toEqual(updates.contactInfo);
      expect(data?.createdAt).toBeInstanceOf(Timestamp);
      expect(data?.updatedAt).toBeInstanceOf(Timestamp);
    });

    it("should throw error if profile not found", async () => {
      await expect(
        profileService.updateProfile("non-existent-id", { bio: "test" }),
      ).rejects.toThrow("Profile not found");
    });

    it("should throw error if new username is taken", async () => {
      // Create first profile
      await profileService.createProfile({
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser1",
      });

      // Create second profile
      const profile2 = await profileService.createProfile({
        walletAddress: "0x0987654321098765432109876543210987654321",
        fingerprintId: "different-fingerprint",
        username: "testuser2",
      });

      // Try to update second profile with first profile's username
      await expect(
        profileService.updateProfile(profile2.id, { username: "testuser1" }),
      ).rejects.toThrow("Username is already taken");
    });

    it("should allow updating to same username", async () => {
      const created = await profileService.createProfile({
        walletAddress: testWalletAddress,
        fingerprintId: testFingerprintId,
        username: "testuser",
      });

      const updated = await profileService.updateProfile(created.id, {
        username: "testuser",
        bio: "Updated bio",
      });

      expect(updated.username).toBe("testuser");
      expect(updated.bio).toBe("Updated bio");
      expect(typeof updated.createdAt).toBe("number");
      expect(typeof updated.updatedAt).toBe("number");
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
    });
  });
});
