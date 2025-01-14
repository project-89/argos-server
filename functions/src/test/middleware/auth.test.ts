import { describe, it, expect, beforeEach } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";

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
    expect(response.data.error).toBe("API key is required");
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
    expect(response.data.error).toBe("Invalid API key");
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

  it("should reject request when API key does not match fingerprint", async () => {
    // Create another fingerprint and API key
    const { apiKey: otherApiKey } = await createTestData();

    // Try to update tags for the first fingerprint using the second fingerprint's API key
    const response = await makeRequest({
      method: "post",
      url: `${API_URL}/tag/update`,
      data: {
        fingerprintId, // Using first fingerprint ID
        tags: { visits: 15 },
      },
      headers: { "x-api-key": otherApiKey }, // Using second fingerprint's API key
    });

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
  });
});
