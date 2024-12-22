import { describe, it, expect, beforeAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { initializeTestEnvironment } from "../utils/testUtils";

const API_URL = TEST_CONFIG.apiUrl;

describe("CORS Middleware", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.ALLOWED_ORIGINS =
      "http://localhost:5173,http://localhost:3000,http://localhost:5000";
    await initializeTestEnvironment();
  });

  it("should handle requests from allowed origins", async () => {
    const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should handle non-credentialed requests without origin", async () => {
    const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
      withCredentials: false,
    });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("should handle preflight requests", async () => {
    const response = await makeRequest("options", `${API_URL}/role/available`, undefined, {
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type,authorization,x-api-key",
        "Access-Control-Request-Credentials": "true",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toBeDefined();
    expect(response.headers["access-control-allow-headers"]).toBeDefined();
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should reject requests from unauthorized origins", async () => {
    const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
      headers: {
        Origin: "https://unauthorized.com",
      },
    });

    expect(response.status).toBe(403);
    expect(response.data).toEqual({
      success: false,
      error: "Forbidden",
      message: "Not allowed by CORS",
    });
  });

  describe("Credentialed Requests", () => {
    it("should handle credentialed requests from allowed origins", async () => {
      const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
        headers: {
          Origin: "http://localhost:5173",
          Cookie: "test=123",
        },
        withCredentials: true,
      });

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      expect(response.headers["vary"]).toBe("Origin");
    });

    it("should expose configured headers in credentialed responses", async () => {
      const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
        headers: {
          Origin: "http://localhost:5173",
        },
        withCredentials: true,
      });

      expect(response.status).toBe(200);
      const exposedHeaders = response.headers["access-control-expose-headers"];
      expect(exposedHeaders).toBeDefined();
      if (exposedHeaders) {
        const headersList = exposedHeaders
          .split(",")
          .map((header: string) => header.trim().toLowerCase());
        expect(headersList).toContain("content-length");
        expect(headersList).toContain("content-type");
        expect(headersList).toContain("x-api-key");
      }
    });

    it("should include Vary header for credentialed requests", async () => {
      const response = await makeRequest("get", `${API_URL}/role/available`, undefined, {
        headers: {
          Origin: "http://localhost:5173",
        },
        withCredentials: true,
      });

      expect(response.status).toBe(200);
      expect(response.headers["vary"]).toBe("Origin");
    });
  });
});
