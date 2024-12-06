import axios from "axios";
import { TEST_CONFIG } from "../test/setup/testConfig";

const API_URL = TEST_CONFIG.apiUrl;
let fingerprintId: string;
let apiKey: string;

const testEndpoints = async () => {
  console.log("🚀 Starting endpoint tests...\n");
  console.log("Waiting for emulators to be fully ready...");

  try {
    // Set up test environment
    process.env.FUNCTIONS_EMULATOR = "true";

    // Test /fingerprint endpoint
    console.log("1️⃣  Testing /fingerprint");
    const fingerprintResponse = await axios.post(`${API_URL}/fingerprint`, {
      fingerprint: "test-fingerprint",
      metadata: {
        test: true,
        timestamp: Date.now(),
      },
    });
    console.log("✅ Fingerprint registered:", fingerprintResponse.data);
    fingerprintId = fingerprintResponse.data.fingerprint.id;

    // Test /api-key endpoint
    console.log("\n2️⃣  Testing /api-key");
    const apiKeyResponse = await axios.post(`${API_URL}/api-key`, {
      name: "Test Key",
      fingerprintId,
    });
    console.log("✅ API key created:", apiKeyResponse.data);
    apiKey = apiKeyResponse.data.apiKey;

    // Test /roles endpoint
    console.log("\n3️⃣  Testing /roles");
    const rolesResponse = await axios.get(`${API_URL}/roles`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Available roles:", rolesResponse.data);

    // Test /role endpoint
    console.log("\n4️⃣  Testing /role");
    const roleResponse = await axios.post(
      `${API_URL}/role`,
      {
        fingerprintId,
        role: "agent-initiate",
      },
      {
        headers: { "x-api-key": apiKey },
      },
    );
    console.log("✅ Role assigned:", roleResponse.data);

    // Test /fingerprint/:id endpoint
    console.log("\n5️⃣  Testing /fingerprint/:id");
    const getFingerprintResponse = await axios.get(`${API_URL}/fingerprint/${fingerprintId}`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Fingerprint retrieved:", getFingerprintResponse.data);

    // Test /visit endpoint
    console.log("\n6️⃣  Testing /visit");
    const visitResponse = await axios.post(
      `${API_URL}/visit`,
      {
        fingerprintId,
        url: "https://test.com",
        title: "Test Page",
        timestamp: Date.now(),
      },
      {
        headers: { "x-api-key": apiKey },
      },
    );
    console.log("✅ Visit logged:", visitResponse.data);

    // Test /presence endpoint
    console.log("\n7️⃣  Testing /presence");
    const presenceResponse = await axios.post(
      `${API_URL}/presence`,
      {
        fingerprintId,
        status: "online",
        currentSites: ["https://test.com"],
      },
      {
        headers: { "x-api-key": apiKey },
      },
    );
    console.log("✅ Presence updated:", presenceResponse.data);

    // Test /reality-stability endpoint
    console.log("\n8️⃣  Testing /reality-stability");
    const stabilityResponse = await axios.get(`${API_URL}/reality-stability`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Reality stability index:", stabilityResponse.data);

    // Test /tags endpoint
    console.log("\n9️⃣  Testing /tags");
    const tagsResponse = await axios.post(
      `${API_URL}/tags`,
      {
        fingerprintId,
        tags: {
          puzzle_solved: 5,
          mission_complete: 10,
        },
      },
      {
        headers: { "x-api-key": apiKey },
      },
    );
    console.log("✅ Tags updated:", tagsResponse.data);

    // Test /tags/roles endpoint
    console.log("\n🔟 Testing /tags/roles");
    const tagRolesResponse = await axios.post(
      `${API_URL}/tags/roles`,
      {
        fingerprintId,
        tagRules: {
          puzzle_solved: "agent-initiate",
          mission_complete: "agent-field",
        },
      },
      {
        headers: { "x-api-key": apiKey },
      },
    );
    console.log("✅ Roles updated by tags:", tagRolesResponse.data);

    // Test /role (DELETE) endpoint
    console.log("\n1️⃣1️⃣ Testing /role (DELETE)");
    const deleteRoleResponse = await axios.delete(`${API_URL}/role`, {
      data: {
        fingerprintId,
        role: "agent-initiate",
      },
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Role removed:", deleteRoleResponse.data);

    // Test /prices endpoint with default tokens
    console.log("\n1️⃣2️⃣ Testing /prices (default tokens)");
    const defaultPricesResponse = await axios.get(`${API_URL}/prices`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Current prices (default):", defaultPricesResponse.data);

    // Test /prices endpoint with specific tokens
    console.log("\n1️⃣3️⃣ Testing /prices (specific tokens)");
    const specificPricesResponse = await axios.get(`${API_URL}/prices?symbols=solana`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Current prices (specific):", specificPricesResponse.data);

    // Test /price/:tokenId endpoint
    console.log("\n1️⃣4️⃣ Testing /price/solana");
    const priceResponse = await axios.get(`${API_URL}/price/solana`, {
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Token price history:", priceResponse.data);

    // Test /presence/site (DELETE) endpoint
    console.log("\n1️⃣5️⃣ Testing /presence/site (DELETE)");
    const deleteSiteResponse = await axios.delete(`${API_URL}/presence/site`, {
      data: {
        fingerprintId,
        siteId: "https://test.com",
      },
      headers: { "x-api-key": apiKey },
    });
    console.log("✅ Site removed:", deleteSiteResponse.data);
  } catch (error: any) {
    console.log("\n❌ Error during endpoint tests:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      endpoint: error.config?.url,
      method: error.config?.method,
    });
    process.exit(1);
  }
};

testEndpoints();
