import { describe, it, expect, beforeAll } from "@jest/globals";
import { TEST_CONFIG } from "../setup/testConfig";
import { makeRequest } from "../utils/testUtils";
import { initializeTestEnvironment } from "../utils/testUtils";
import { CORS_CONFIG } from "../../constants/config";

describe("CORS Test Suite", () => {
  const API_URL = TEST_CONFIG.apiUrl;

  beforeAll(async () => {
    // Ensure test environment is properly set
    process.env.NODE_ENV = "test";
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.ALLOWED_ORIGINS = "https://test.com,https://example.com,https://newsite.com";

    await initializeTestEnvironment();

    // Verify environment setup
    console.log("[CORS Test] Environment setup:", {
      NODE_ENV: process.env.NODE_ENV,
      FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    });

    // Verify CORS configuration
    const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
    console.log("[CORS Test] Allowed origins from CORS_CONFIG:", allowedOrigins);

    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.FUNCTIONS_EMULATOR).toBe("true");
    expect(process.env.ALLOWED_ORIGINS).toBeDefined();
    expect(allowedOrigins).toContain("https://test.com");
    expect(allowedOrigins).toContain("https://example.com");
    expect(allowedOrigins).toContain("https://newsite.com");
  });

  it("should allow requests from default development origins", async () => {
    const origin = "http://localhost:5173";
    console.log("[CORS Test] Testing development origin:", origin);

    const response = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: {
        Origin: origin,
      },
      validateStatus: () => true,
    });

    console.log("[CORS Test] Response headers:", response.headers);
    console.log("[CORS Test] Response status:", response.status);
    if (response.status !== 200) {
      console.log("[CORS Test] Response data:", response.data);
    }

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
    expect(response.status).toBe(200);
  });

  it("should allow requests from test origins", async () => {
    const origin = "https://test.com";
    console.log("[CORS Test] Testing test origin:", origin);

    // Verify the origin is in the allowed list
    const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
    console.log("[CORS Test] Current allowed origins:", allowedOrigins);
    expect(allowedOrigins).toContain(origin);

    const response = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: {
        Origin: origin,
      },
      validateStatus: () => true,
    });

    console.log("[CORS Test] Response headers:", response.headers);
    console.log("[CORS Test] Response status:", response.status);
    if (response.status !== 200) {
      console.log("[CORS Test] Response data:", response.data);
    }

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
    expect(response.status).toBe(200);
  });

  it("should block requests from unauthorized origins", async () => {
    const origin = "https://unauthorized.com";
    console.log("[CORS Test] Testing unauthorized origin:", origin);

    const response = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: {
        Origin: origin,
      },
      validateStatus: () => true,
    });

    console.log("[CORS Test] Response headers:", response.headers);
    console.log("[CORS Test] Response status:", response.status);
    console.log("[CORS Test] Response data:", response.data);

    expect(response.status).toBe(500);
    expect(response.data).toContain("Not allowed by CORS");
  });

  it("should handle preflight requests", async () => {
    const response = await makeRequest("options", `${API_URL}/role/available`, null, {
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type,authorization,x-api-key",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toBeDefined();
    expect(response.headers["access-control-allow-headers"]).toBeDefined();
    if (response.headers["access-control-max-age"]) {
      expect(response.headers["access-control-max-age"]).toBe("86400");
    }
  });

  it("should allow requests with no origin", async () => {
    const response = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: {
        Origin: undefined,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
  });

  it("should allow requests from additional test origins", async () => {
    // Verify the origin is in the allowed list
    const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
    expect(allowedOrigins).toContain("https://newsite.com");

    const response = await makeRequest("get", `${API_URL}/role/available`, null, {
      headers: {
        Origin: "https://newsite.com",
      },
      validateStatus: () => true,
    });

    expect(response.headers["access-control-allow-origin"]).toBe("https://newsite.com");
    expect(response.status).toBe(200);
  });
});
