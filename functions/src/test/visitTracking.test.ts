import axios from "axios";
import { TEST_CONFIG } from "./testConfig";
import { createTestData } from "./testUtils";
import { describe, it, expect } from "@jest/globals";

describe("Visit Tracking Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let fingerprintId: string;
  let apiKey: string;

  beforeEach(async () => {
    // Create test data and get API key
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    apiKey = testData.apiKey;
  });

  describe("POST /visit", () => {
    it("should log a visit", async () => {
      const response = await axios.post(
        `${API_URL}/visit`,
        {
          fingerprintId,
          url: "https://test.com",
          title: "Test Page",
          timestamp: Date.now(),
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require fingerprintId and url", async () => {
      await expect(
        axios.post(
          `${API_URL}/visit`,
          {
            fingerprintId, // missing url
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining("Missing required fields"),
          }),
        },
      });
    });
  });

  describe("POST /presence", () => {
    it("should update presence status", async () => {
      const response = await axios.post(
        `${API_URL}/presence`,
        {
          fingerprintId,
          status: "online",
          currentSites: ["https://test.com"],
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require fingerprintId and status", async () => {
      await expect(
        axios.post(
          `${API_URL}/presence`,
          {
            fingerprintId, // missing status
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining("Missing required fields"),
          }),
        },
      });
    });
  });

  describe("DELETE /presence/site", () => {
    it("should remove a site", async () => {
      const response = await axios.delete(`${API_URL}/presence/site`, {
        data: {
          fingerprintId,
          siteId: "test-site",
        },
        headers: {
          "x-api-key": apiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should require fingerprintId and siteId", async () => {
      await expect(
        axios.delete(`${API_URL}/presence/site`, {
          data: {
            fingerprintId, // missing siteId
          },
          headers: {
            "x-api-key": apiKey,
          },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining("Missing required fields"),
          }),
        },
      });
    });
  });
});
