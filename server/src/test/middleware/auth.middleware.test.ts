import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";
import { ERROR_MESSAGES, COLLECTIONS } from "../../constants";
import { getFirestore } from "firebase-admin/firestore";

describe("Auth Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    // Create test data
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  it("should allow public endpoint without API key", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/fingerprint/register`,
      data: {
        fingerprint: "test-fingerprint",
      },
    });
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
  });

  it("should reject protected endpoint without API key", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/tag/update`,
      data: {
        fingerprintId,
        tags: { visits: 10 },
      },
      // Omit headers entirely to test missing API key
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.MISSING_API_KEY);
  });

  it("should reject protected endpoint with invalid API key", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/tag/update`,
      data: {
        fingerprintId,
        tags: { visits: 10 },
      },
      headers: { "x-api-key": "invalid-key" },
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });

  it("should allow protected endpoint with valid API key", async () => {
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/visit/presence`,
      data: {
        fingerprintId,
        status: "online",
      },
      headers: { "x-api-key": validApiKey },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.status).toBe("online");
  });

  it("should reject API key when fingerprint no longer exists", async () => {
    // First create a new fingerprint and get its API key
    const { fingerprintId: tempId, apiKey: tempApiKey } = await createTestData();

    // Then delete the fingerprint
    const db = getFirestore();
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(tempId).delete();

    // Try to use the API key
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/visit/presence`,
      data: {
        fingerprintId: tempId,
        status: "online",
      },
      headers: { "x-api-key": tempApiKey },
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });

  it("should reject inactive API key", async () => {
    // First deactivate the API key
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("key", "==", validApiKey)
      .get();

    await snapshot.docs[0].ref.update({ active: false });

    // Try to use the deactivated API key
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/visit/presence`,
      data: {
        fingerprintId,
        status: "online",
      },
      headers: { "x-api-key": validApiKey },
    });

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_API_KEY);
  });
});
