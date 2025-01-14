import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase } from "../utils/testUtils";

describe("Impression Endpoint", () => {
  const API_URL = TEST_CONFIG.apiUrl;
  let validApiKey: string;
  let fingerprintId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { fingerprintId: fId, apiKey } = await createTestData();
    fingerprintId = fId;
    validApiKey = apiKey;
  });

  describe("POST /impressions", () => {
    it("should create an impression", async () => {
      const impressionData = {
        fingerprintId,
        type: "form_submission",
        data: {
          formId: "contact-form",
          fields: ["name", "email"],
        },
      };

      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: impressionData,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty("id");
    });

    it("should require API key", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: {
          fingerprintId,
          type: "form_submission",
          data: {
            formId: "contact-form",
          },
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should validate impression data", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: {
          // Missing required fields
          data: {
            formId: "contact-form",
          },
        },
        headers: {
          "x-api-key": validApiKey,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe("GET /impressions/:fingerprintId", () => {
    it("should get impressions for fingerprint", async () => {
      // Create test impression first
      const impressionData = {
        fingerprintId,
        type: "form_submission",
        data: {
          formId: "contact-form",
        },
      };

      await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: impressionData,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    it("should filter impressions by type", async () => {
      // Create test impressions
      const formSubmission = {
        fingerprintId,
        type: "form_submission",
        data: { formId: "contact" },
      };

      const pageView = {
        fingerprintId,
        type: "page_view",
        data: { path: "/home" },
      };

      await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: formSubmission,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      await makeRequest({
        method: "post",
        url: `${API_URL}/impressions`,
        data: pageView,
        headers: {
          "x-api-key": validApiKey,
        },
      });

      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/impressions/${fingerprintId}`,
        headers: {
          "x-api-key": validApiKey,
        },
        params: { type: "form_submission" },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.every((imp: any) => imp.type === "form_submission")).toBe(true);
    });

    it("should require API key for retrieval", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/impressions/${fingerprintId}`,
        headers: {},
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key is required");
    });

    it("should validate fingerprint ownership", async () => {
      // Create another test fingerprint
      const { fingerprintId: otherId } = await createTestData();

      const response = await makeRequest({
        method: "get",
        url: `${API_URL}/impressions/${otherId}`,
        headers: {
          "x-api-key": validApiKey, // Using first fingerprint's API key
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("API key does not match fingerprint");
    });
  });
});
