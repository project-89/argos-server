import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ROLE } from "../../constants/roles";
import { ERROR_MESSAGES } from "../../constants/api";
import { ApiError } from "../../utils/error";
import { cleanDatabase } from "../utils/testUtils";
import {
  canManageRole,
  isAdmin,
  assignRole,
  removeRole,
  getAvailableRoles,
} from "../../services/role.service";

describe("Role Service", () => {
  const db = getFirestore();
  const testFingerprints = {
    admin: "test-admin-fingerprint",
    senior: "test-senior-fingerprint",
    field: "test-field-fingerprint",
    user: "test-user-fingerprint",
    target: "test-target-fingerprint",
  };

  beforeEach(async () => {
    await cleanDatabase();
    // Set up test fingerprints with roles
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.admin)
      .set({
        roles: [ROLE.ADMIN, ROLE.USER],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.senior)
      .set({
        roles: [ROLE.AGENT_SENIOR, ROLE.USER],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.field)
      .set({
        roles: [ROLE.AGENT_FIELD, ROLE.USER],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.user)
      .set({
        roles: [ROLE.USER],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.target)
      .set({
        roles: [ROLE.USER],
      });
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("canManageRole", () => {
    it("should allow admin to manage any role", async () => {
      const result = await canManageRole(testFingerprints.admin, ROLE.AGENT_MASTER);
      expect(result).toBe(true);
    });

    it("should allow senior agent to manage field agent role", async () => {
      const result = await canManageRole(testFingerprints.senior, ROLE.AGENT_FIELD);
      expect(result).toBe(true);
    });

    it("should not allow field agent to manage senior agent role", async () => {
      const result = await canManageRole(testFingerprints.field, ROLE.AGENT_SENIOR);
      expect(result).toBe(false);
    });

    it("should return false for non-existent fingerprint", async () => {
      const result = await canManageRole("non-existent", ROLE.USER);
      expect(result).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin fingerprint", async () => {
      const result = await isAdmin(testFingerprints.admin);
      expect(result).toBe(true);
    });

    it("should return false for non-admin fingerprint", async () => {
      const result = await isAdmin(testFingerprints.user);
      expect(result).toBe(false);
    });

    it("should return false for non-existent fingerprint", async () => {
      const result = await isAdmin("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("assignRole", () => {
    it("should allow admin to assign any role", async () => {
      const result = await assignRole(
        testFingerprints.target,
        testFingerprints.admin,
        ROLE.AGENT_MASTER,
      );
      expect(result.roles).toContain(ROLE.AGENT_MASTER);
      expect(result.roles).toContain(ROLE.USER);
    });

    it("should allow senior agent to assign field agent role", async () => {
      const result = await assignRole(
        testFingerprints.target,
        testFingerprints.senior,
        ROLE.AGENT_FIELD,
      );
      expect(result.roles).toContain(ROLE.AGENT_FIELD);
      expect(result.roles).toContain(ROLE.USER);
    });

    it("should not allow field agent to assign senior role", async () => {
      await expect(
        assignRole(testFingerprints.target, testFingerprints.field, ROLE.AGENT_SENIOR),
      ).rejects.toThrow(new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED));
    });

    it("should not allow non-admin to modify their own roles", async () => {
      await expect(
        assignRole(testFingerprints.senior, testFingerprints.senior, ROLE.AGENT_MASTER),
      ).rejects.toThrow(new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED));
    });

    it("should throw 404 for non-existent target fingerprint", async () => {
      await expect(
        assignRole("non-existent", testFingerprints.admin, ROLE.AGENT_FIELD),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    });
  });

  describe("removeRole", () => {
    it("should allow admin to remove any role", async () => {
      // First assign a role
      await assignRole(testFingerprints.target, testFingerprints.admin, ROLE.AGENT_MASTER);
      // Then remove it
      const result = await removeRole(
        testFingerprints.target,
        testFingerprints.admin,
        ROLE.AGENT_MASTER,
      );
      expect(result.roles).not.toContain(ROLE.AGENT_MASTER);
      expect(result.roles).toContain(ROLE.USER);
    });

    it("should not allow removing USER role", async () => {
      await expect(
        removeRole(testFingerprints.target, testFingerprints.admin, ROLE.USER),
      ).rejects.toThrow(new ApiError(400, ERROR_MESSAGES.CANNOT_REMOVE_USER_ROLE));
    });

    it("should not allow non-admin to modify their own roles", async () => {
      await expect(
        removeRole(testFingerprints.senior, testFingerprints.senior, ROLE.AGENT_SENIOR),
      ).rejects.toThrow(new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED));
    });

    it("should throw 404 for non-existent target fingerprint", async () => {
      await expect(
        removeRole("non-existent", testFingerprints.admin, ROLE.AGENT_FIELD),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    });
  });

  describe("getAvailableRoles", () => {
    it("should return all available roles", () => {
      const roles = getAvailableRoles();
      expect(roles).toContain(ROLE.USER);
      expect(roles).toContain(ROLE.AGENT_INITIATE);
      expect(roles).toContain(ROLE.AGENT_FIELD);
      expect(roles).toContain(ROLE.AGENT_SENIOR);
      expect(roles).toContain(ROLE.AGENT_MASTER);
      expect(roles).toContain(ROLE.ADMIN);
      expect(roles.length).toBe(6);
    });
  });
});
