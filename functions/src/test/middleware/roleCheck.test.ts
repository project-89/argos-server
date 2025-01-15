import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../utils/testUtils";
import { ROLE } from "../../constants/roles";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { validateApiKey } from "../../services/apiKeyService";

describe("Role Check Middleware Test Suite", () => {
  let adminApiKey: string;
  let adminFingerprintId: string;
  let userApiKey: string;
  let userFingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create admin user
    const adminData = await createTestData({ roles: [ROLE.ADMIN, ROLE.USER] });
    adminApiKey = adminData.apiKey;
    adminFingerprintId = adminData.fingerprintId;

    // Create regular user
    const userData = await createTestData();
    userApiKey = userData.apiKey;
    userFingerprintId = userData.fingerprintId;

    // Verify roles were set correctly
    const db = getFirestore();
    const adminDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(adminFingerprintId).get();
    const adminRoles = adminDoc.data()?.roles || [];
    console.log("Admin roles:", adminRoles);
    expect(adminRoles).toContain(ROLE.ADMIN);

    const userDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(userFingerprintId).get();
    const userRoles = userDoc.data()?.roles || [];
    console.log("User roles:", userRoles);
    expect(userRoles).toContain(ROLE.USER);

    // Verify API keys are valid
    const adminKeyValid = await validateApiKey(adminApiKey);
    expect(adminKeyValid.isValid).toBe(true);
    console.log("Admin API key is valid:", adminKeyValid);

    const userKeyValid = await validateApiKey(userApiKey);
    expect(userKeyValid.isValid).toBe(true);
    console.log("User API key is valid:", userKeyValid);
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  it("should allow admin to modify their own roles", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: adminFingerprintId,
        role: "agent-master",
      },
      headers: {
        "x-api-key": adminApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should allow admin to modify other users' roles", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: userFingerprintId,
        role: "agent-initiate",
      },
      headers: {
        "x-api-key": adminApiKey,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it("should not allow non-admin to modify roles", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: userFingerprintId,
        role: "agent-initiate",
      },
      headers: {
        "x-api-key": userApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Admin role required");
  });

  it("should not allow non-admin to modify their own roles", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: userFingerprintId,
        role: "agent-master",
      },
      headers: {
        "x-api-key": userApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Admin role required");
  });

  it("should handle missing API key", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: userFingerprintId,
        role: "agent-master",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key is required");
  });

  it("should handle invalid fingerprint", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/admin/role/assign`,
      data: {
        fingerprintId: "invalid-fingerprint",
        role: "agent-master",
      },
      headers: {
        "x-api-key": adminApiKey,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Fingerprint not found");
  });
});
