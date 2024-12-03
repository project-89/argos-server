import axios from "axios";
import { TEST_CONFIG, createTestData } from "./setup";
import { describe, it, expect } from "@jest/globals";

describe("Visit Tracking Endpoints", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let fingerprintId: string;
  let apiKey: string;

  beforeEach(async () => {
    // Create test data and get API key
    const { fingerprintId: id } = await createTestData();
    fingerprintId = id;

    // Register API key
    const keyResponse = await axios.post(`${API_URL}/register-api-key`, {
      name: "test-key",
      fingerprintId,
      metadata: { test: true },
    });
    apiKey = keyResponse.data.apiKey;
  });

  describe("POST /log-visit", () => {
    it("should log a visit", async () => {
      const response = await axios.post(
        `${API_URL}/log-visit`,
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
      try {
        await axios.post(
          `${API_URL}/log-visit`,
          {
            fingerprintId, // missing url
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });
  });

  describe("POST /update-presence", () => {
    it("should update presence status", async () => {
      const response = await axios.post(
        `${API_URL}/update-presence`,
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
      try {
        await axios.post(
          `${API_URL}/update-presence`,
          {
            fingerprintId, // missing status
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });
  });

  describe("POST /remove-site", () => {
    it("should remove a site", async () => {
      const response = await axios.post(
        `${API_URL}/remove-site`,
        {
          fingerprintId,
          siteId: "test-site",
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

    it("should require fingerprintId and siteId", async () => {
      try {
        await axios.post(
          `${API_URL}/remove-site`,
          {
            fingerprintId, // missing siteId
          },
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });
  });
});
