import axios from "axios";
import { PredefinedRole } from "../types";

const API_URL = "http://localhost:5001/argos-434718/us-central1/api";

// Helper function to wait between requests
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testEndpoints() {
  try {
    console.log("🚀 Starting endpoint tests...\n");

    // Initial delay to ensure emulators are ready
    console.log("Waiting for emulators to be fully ready...");
    await wait(2000);

    // 1. Register a fingerprint
    console.log("1️⃣  Testing /fingerprint");
    const fingerprintResponse = await axios.post(`${API_URL}/fingerprint`, {
      fingerprint: "test-fingerprint",
      metadata: {
        test: true,
        timestamp: Date.now(),
      },
    });
    console.log("✅ Fingerprint registered:", fingerprintResponse.data);
    const fingerprintId = fingerprintResponse.data.fingerprint.id;

    await wait(1000); // Wait 1 second between requests

    // 2. Register an API key
    console.log("\n2️⃣  Testing /api-key");
    const apiKeyResponse = await axios.post(`${API_URL}/api-key`, {
      name: "test-key",
      fingerprintId,
      metadata: {
        test: true,
      },
    });
    console.log("✅ API key created:", apiKeyResponse.data);
    const apiKey = apiKeyResponse.data.apiKey;

    await wait(1000);

    // Set up axios with API key
    const axiosWithAuth = axios.create({
      headers: {
        "x-api-key": apiKey,
      },
    });

    // 3. Get available roles
    console.log("\n3️⃣  Testing /roles");
    const rolesResponse = await axiosWithAuth.get(`${API_URL}/roles`);
    console.log("✅ Available roles:", rolesResponse.data);

    await wait(1000);

    // 4. Assign a role
    console.log("\n4️⃣  Testing /role");
    const assignRoleResponse = await axiosWithAuth.post(`${API_URL}/role`, {
      fingerprintId,
      role: "agent-initiate" as PredefinedRole,
    });
    console.log("✅ Role assigned:", assignRoleResponse.data);

    await wait(1000);

    // 5. Get fingerprint
    console.log("\n5️⃣  Testing /fingerprint/:id");
    const getFingerprintResponse = await axiosWithAuth.get(
      `${API_URL}/fingerprint/${fingerprintId}`,
    );
    console.log("✅ Fingerprint retrieved:", getFingerprintResponse.data);

    await wait(1000);

    // 6. Log a visit
    console.log("\n6️⃣  Testing /visit");
    const logVisitResponse = await axiosWithAuth.post(`${API_URL}/visit`, {
      fingerprintId,
      url: "https://test.com",
      title: "Test Page",
      timestamp: Date.now(),
    });
    console.log("✅ Visit logged:", logVisitResponse.data);

    await wait(1000);

    // 7. Update presence
    console.log("\n7️⃣  Testing /presence");
    const updatePresenceResponse = await axiosWithAuth.post(`${API_URL}/presence`, {
      fingerprintId,
      status: "online",
      currentSites: ["https://test.com"],
    });
    console.log("✅ Presence updated:", updatePresenceResponse.data);

    await wait(1000);

    // 8. Get reality stability index
    console.log("\n8️⃣  Testing /reality-stability");
    const stabilityResponse = await axiosWithAuth.get(`${API_URL}/reality-stability`);
    console.log("✅ Reality stability index:", stabilityResponse.data);

    await wait(1000);

    // 9. Update tags
    console.log("\n9️⃣  Testing /tags");
    const updateTagsResponse = await axiosWithAuth.post(`${API_URL}/tags`, {
      fingerprintId,
      tags: {
        puzzle_solved: 5,
        mission_complete: 10,
      },
    });
    console.log("✅ Tags updated:", updateTagsResponse.data);

    await wait(1000);

    // 10. Update roles by tags
    console.log("\n🔟 Testing /tags/roles");
    const updateRolesByTagsResponse = await axiosWithAuth.post(`${API_URL}/tags/roles`, {
      fingerprintId,
      tagRules: {
        puzzle_solved: "agent-initiate",
        mission_complete: "agent-field",
      },
    });
    console.log("✅ Roles updated by tags:", updateRolesByTagsResponse.data);

    await wait(1000);

    // 11. Remove a role
    console.log("\n1️⃣1️⃣ Testing /role (DELETE)");
    const removeRoleResponse = await axiosWithAuth.delete(`${API_URL}/role`, {
      data: {
        fingerprintId,
        role: "agent-initiate" as PredefinedRole,
      },
    });
    console.log("✅ Role removed:", removeRoleResponse.data);

    await wait(1000);

    // 12. Remove a site
    console.log("\n1️⃣2️⃣ Testing /presence/site (DELETE)");
    const removeSiteResponse = await axiosWithAuth.delete(`${API_URL}/presence/site`, {
      data: {
        fingerprintId,
        siteId: "test-site",
      },
    });
    console.log("✅ Site removed:", removeSiteResponse.data);

    console.log("\n✨ All endpoint tests completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Error during endpoint tests:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      endpoint: error.config?.url,
      method: error.config?.method,
    });
    process.exit(1);
  }
}

// Run the tests
testEndpoints();
