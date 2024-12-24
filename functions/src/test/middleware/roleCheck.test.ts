import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";

describe("Role Check Middleware Test Suite", () => {
  let adminApiKey: string;
  let adminFingerprintId: string;
  let userApiKey: string;
  let userFingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    // Create admin user
    const adminData = await createTestData({ isAdmin: true });
    adminApiKey = adminData.apiKey;
    adminFingerprintId = adminData.fingerprintId;

    // Create regular user
    const userData = await createTestData();
    userApiKey = userData.apiKey;
    userFingerprintId = userData.fingerprintId;

    // Wait for a short time to ensure roles are set
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("should allow admin to modify their own roles", async () => {
    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      {
        fingerprintId: adminFingerprintId,
        role: "agent-master",
      },
      {
        headers: {
          "x-api-key": adminApiKey,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should allow admin to modify other users' roles", async () => {
    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      {
        fingerprintId: userFingerprintId,
        role: "agent-initiate",
      },
      {
        headers: {
          "x-api-key": adminApiKey,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should reject non-admin access to admin endpoints", async () => {
    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      {
        fingerprintId: userFingerprintId,
        role: "agent-initiate",
      },
      {
        headers: {
          "x-api-key": userApiKey,
        },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("admin role required");
  });

  it("should reject requests to admin endpoints when no role data exists", async () => {
    // Create a fingerprint without roles
    const noRolesData = await createTestData({ roles: [] });

    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      {
        fingerprintId: userFingerprintId,
        role: "agent-initiate",
      },
      {
        headers: {
          "x-api-key": noRolesData.apiKey,
        },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("admin role required");
  });

  it("should allow admin access to tag management endpoints", async () => {
    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/tag/update`,
      {
        fingerprintId: userFingerprintId,
        tags: ["test-tag"],
      },
      {
        headers: {
          "x-api-key": adminApiKey,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should reject non-admin access to tag management endpoints", async () => {
    const response = await makeRequest(
      "post",
      `${TEST_CONFIG.apiUrl}/admin/tag/update`,
      {
        fingerprintId: userFingerprintId,
        tags: ["test-tag"],
      },
      {
        headers: {
          "x-api-key": userApiKey,
        },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("admin role required");
  });
});
