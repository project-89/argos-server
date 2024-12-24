import { describe, it, expect, beforeAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { createTestData } from "../utils/testUtils";

describe("Auth Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    // Then create test data
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  it("should allow public endpoint without API key", async () => {
    const response = await makeRequest("post", `${API_URL}/fingerprint/register`, {
      fingerprint: "test-fingerprint",
    });
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
  });

  it("should reject protected endpoint without API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId,
        tags: { visits: 10 },
      },
      {
        headers: { "x-api-key": undefined },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key is required");
  });

  it("should reject protected endpoint with invalid API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId,
        tags: { visits: 10 },
      },
      {
        headers: { "x-api-key": "invalid-key" },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Invalid API key");
  });

  it("should allow protected endpoint with valid API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/visit/presence`,
      {
        fingerprintId,
        status: "online",
      },
      {
        headers: { "x-api-key": validApiKey },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.status).toBe("online");
  });

  it("should reject request when API key does not match fingerprint", async () => {
    // Create another fingerprint and API key
    const { apiKey: otherApiKey } = await createTestData();

    // Try to update tags for the first fingerprint using the second fingerprint's API key
    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId, // Using first fingerprint ID
        tags: { visits: 15 },
      },
      {
        headers: { "x-api-key": otherApiKey }, // Using second fingerprint's API key
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
  });
});
