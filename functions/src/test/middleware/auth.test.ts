import { describe, it, expect, beforeAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { initializeTestEnvironment, createTestData } from "../utils/testUtils";

describe("Auth Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validEncryptedApiKey: string;
  let fingerprintId: string;

  beforeAll(async () => {
    await initializeTestEnvironment();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validEncryptedApiKey = apiKey;
  });

  it("should allow public endpoint without API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/fingerprint/register`,
      {
        fingerprint: "public-test-fingerprint",
      },
      {
        headers: { "x-api-key": undefined },
        validateStatus: () => true,
      },
    );
    expect(response.status).toBe(200);
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

  it("should reject protected endpoint with unencrypted API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId,
        tags: { visits: 10 },
      },
      {
        headers: { "x-api-key": "unencrypted-invalid-key" },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Invalid API key");
  });

  it("should reject protected endpoint with malformed encrypted API key", async () => {
    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId,
        tags: { visits: 10 },
      },
      {
        headers: { "x-api-key": "malformed.encrypted.key" },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("Invalid API key");
  });

  it("should allow protected endpoint with valid encrypted API key", async () => {
    // Verify that we have an encrypted API key (should be a long string)
    expect(validEncryptedApiKey).toBeTruthy();
    expect(validEncryptedApiKey.length).toBeGreaterThan(32); // Encrypted keys should be fairly long

    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId,
        tags: { visits: 5 },
      },
      {
        headers: { "x-api-key": validEncryptedApiKey },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.tags.visits).toBe(5);
  });

  it("should reject request when encrypted API key does not match fingerprint", async () => {
    // Create another fingerprint and API key
    const { apiKey: otherEncryptedApiKey } = await createTestData();

    // Verify we got a different encrypted key
    expect(otherEncryptedApiKey).not.toBe(validEncryptedApiKey);

    const response = await makeRequest(
      "post",
      `${API_URL}/tag/update`,
      {
        fingerprintId, // Using first fingerprint ID
        tags: { visits: 15 },
      },
      {
        headers: { "x-api-key": otherEncryptedApiKey }, // Using second fingerprint's encrypted key
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(403);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe("API key does not match fingerprint");
  });
});
