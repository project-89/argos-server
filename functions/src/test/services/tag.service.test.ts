import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ROLE } from "../../constants/roles";
import { ERROR_MESSAGES } from "../../constants/api";
import { ApiError } from "../../utils/error";
import { cleanDatabase } from "../utils/testUtils";
import {
  canManageRole,
  updateTags,
  updateRolesByTags,
  getTags,
  removeTags,
} from "../../services/tagService";

describe("Tag Service", () => {
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
    // Set up test fingerprints with roles and tags
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.admin)
      .set({
        roles: [ROLE.ADMIN, ROLE.USER],
        tags: ["admin", "verified"],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.senior)
      .set({
        roles: [ROLE.AGENT_SENIOR, ROLE.USER],
        tags: ["senior", "verified"],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.field)
      .set({
        roles: [ROLE.AGENT_FIELD, ROLE.USER],
        tags: ["field", "verified"],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.user)
      .set({
        roles: [ROLE.USER],
        tags: ["user"],
      });
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(testFingerprints.target)
      .set({
        roles: [ROLE.USER],
        tags: ["target"],
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

  describe("updateTags", () => {
    it("should add new tags to a fingerprint", async () => {
      const newTags = ["test", "verified"];
      const result = await updateTags(testFingerprints.target, newTags);
      expect(result.fingerprintId).toBe(testFingerprints.target);
      expect(result.tags).toContain("test");
      expect(result.tags).toContain("verified");
      expect(result.tags).toContain("target"); // Should keep existing tags
    });

    it("should not create duplicate tags", async () => {
      const newTags = ["verified", "verified"];
      const result = await updateTags(testFingerprints.user, newTags);
      expect(result.tags.filter((tag) => tag === "verified").length).toBe(1);
    });

    it("should throw 404 for non-existent fingerprint", async () => {
      await expect(updateTags("non-existent", ["test"])).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });

  describe("updateRolesByTags", () => {
    const tagRules = {
      seniorRule: {
        tags: ["senior", "verified"],
        role: ROLE.AGENT_SENIOR,
      },
      fieldRule: {
        tags: ["field", "verified"],
        role: ROLE.AGENT_FIELD,
      },
    };

    it("should update roles based on matching tag rules", async () => {
      // First add required tags
      await updateTags(testFingerprints.target, ["field", "verified"]);

      const result = await updateRolesByTags(
        testFingerprints.target,
        testFingerprints.admin,
        tagRules,
      );

      expect(result.roles).toContain(ROLE.AGENT_FIELD);
      expect(result.roles).toContain(ROLE.USER);
    });

    it("should not update roles if tags don't match rules", async () => {
      const result = await updateRolesByTags(
        testFingerprints.target,
        testFingerprints.admin,
        tagRules,
      );

      expect(result.roles).not.toContain(ROLE.AGENT_FIELD);
      expect(result.roles).not.toContain(ROLE.AGENT_SENIOR);
      expect(result.roles).toContain(ROLE.USER);
    });

    it("should not allow self-role modification", async () => {
      await expect(
        updateRolesByTags(testFingerprints.senior, testFingerprints.senior, tagRules),
      ).rejects.toThrow(new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED));
    });

    it("should throw 403 if caller lacks privileges", async () => {
      await expect(
        updateRolesByTags(testFingerprints.target, testFingerprints.field, tagRules),
      ).rejects.toThrow(new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED));
    });

    it("should throw 404 for non-existent fingerprint", async () => {
      await expect(
        updateRolesByTags("non-existent", testFingerprints.admin, tagRules),
      ).rejects.toThrow(new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    });
  });

  describe("getTags", () => {
    it("should return all tags for a fingerprint", async () => {
      const tags = await getTags(testFingerprints.admin);
      expect(tags).toContain("admin");
      expect(tags).toContain("verified");
      expect(tags.length).toBe(2);
    });

    it("should return empty array for fingerprint with no tags", async () => {
      // Create a fingerprint without tags
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc("no-tags")
        .set({ roles: [ROLE.USER] });

      const tags = await getTags("no-tags");
      expect(tags).toEqual([]);
    });

    it("should throw 404 for non-existent fingerprint", async () => {
      await expect(getTags("non-existent")).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });

  describe("removeTags", () => {
    it("should remove specified tags from a fingerprint", async () => {
      const result = await removeTags(testFingerprints.admin, ["verified"]);
      expect(result.tags).toContain("admin");
      expect(result.tags).not.toContain("verified");
    });

    it("should handle removing non-existent tags", async () => {
      const result = await removeTags(testFingerprints.admin, ["non-existent-tag"]);
      expect(result.tags).toEqual(["admin", "verified"]);
    });

    it("should throw 404 for non-existent fingerprint", async () => {
      await expect(removeTags("non-existent", ["test"])).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });
  });
});
