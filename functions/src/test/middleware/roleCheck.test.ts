import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, cleanDatabase } from "../utils/testUtils";
import { initializeTestEnvironment, createTestData } from "../utils/testUtils";

describe("Role Check Middleware Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let adminApiKey: string;
  let userApiKey: string;
  let adminFingerprintId: string;
  let userFingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Create admin user
    const adminData = await createTestData({ roles: ["admin"] });
    adminApiKey = adminData.apiKey;
    adminFingerprintId = adminData.fingerprintId;

    // Create regular user
    const userData = await createTestData({ roles: ["user"] });
    userApiKey = userData.apiKey;
    userFingerprintId = userData.fingerprintId;

    // Verify data was created
    const adminResponse = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: { "x-api-key": adminApiKey },
    });
    expect(adminResponse.status).toBe(200);

    const userResponse = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: { "x-api-key": userApiKey },
    });
    expect(userResponse.status).toBe(200);
  });

  it("should allow admin to modify their own roles", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/admin/role/assign`,
      {
        fingerprintId: adminFingerprintId,
        role: "agent-field",
      },
      {
        headers: { "x-api-key": adminApiKey },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should allow admin to modify other users' roles", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/admin/role/assign`,
      {
        fingerprintId: userFingerprintId,
        role: "agent-field",
      },
      {
        headers: { "x-api-key": adminApiKey },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should reject non-admin access to admin endpoints", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/admin/role/assign`,
      {
        fingerprintId: userFingerprintId,
        role: "agent-field",
      },
      {
        headers: { "x-api-key": userApiKey },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("admin role required");
  });

  it("should reject requests to admin endpoints when no role data exists", async () => {
    // Create user without roles
    const noRoleData = await createTestData();

    const response = await makeRequest(
      "post",
      `${API_URL}/admin/role/assign`,
      {
        fingerprintId: noRoleData.fingerprintId,
        role: "agent-field",
      },
      {
        headers: { "x-api-key": noRoleData.apiKey },
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
      `${API_URL}/admin/tag/update`,
      {
        fingerprintId: userFingerprintId,
        tags: ["level-1"],
      },
      {
        headers: { "x-api-key": adminApiKey },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should reject non-admin access to tag management endpoints", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/admin/tag/update`,
      {
        fingerprintId: userFingerprintId,
        tags: ["level-2"],
      },
      {
        headers: { "x-api-key": userApiKey },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("admin role required");
  });
});
