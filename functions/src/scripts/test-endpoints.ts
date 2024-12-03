import axios from "axios";
import { PredefinedRole } from "../types";

const API_URL = "http://localhost:5001/argos-434718/us-central1/api";

async function testEndpoints() {
  try {
    console.log("🚀 Starting endpoint tests...\n");

    // 1. Register a fingerprint
    console.log("1️⃣  Testing /register-fingerprint");
    const fingerprintResponse = await axios.post(`${API_URL}/register-fingerprint`, {
      fingerprint: "test-fingerprint",
      metadata: {
        test: true,
        timestamp: Date.now(),
      },
    });
    console.log("✅ Fingerprint registered:", fingerprintResponse.data);
    const fingerprintId = fingerprintResponse.data.message.split(": ")[1];

    // 2. Register an API key
    console.log("\n2️⃣  Testing /register-api-key");
    const apiKeyResponse = await axios.post(`${API_URL}/register-api-key`, {
      name: "test-key",
      fingerprintId,
      metadata: {
        test: true,
      },
    });
    console.log("✅ API key created:", apiKeyResponse.data);
    const apiKey = apiKeyResponse.data.apiKey;

    // Set up axios with API key
    const axiosWithAuth = axios.create({
      headers: {
        "x-api-key": apiKey,
      },
    });

    // 3. Get available roles
    console.log("\n3️⃣  Testing /available-roles");
    const rolesResponse = await axiosWithAuth.get(`${API_URL}/available-roles`);
    console.log("✅ Available roles:", rolesResponse.data);

    // 4. Assign a role
    console.log("\n4️⃣  Testing /assign-role");
    const assignRoleResponse = await axiosWithAuth.post(`${API_URL}/assign-role`, {
      fingerprintId,
      role: "agent-initiate" as PredefinedRole,
    });
    console.log("✅ Role assigned:", assignRoleResponse.data);

    // 5. Get fingerprint
    console.log("\n5️⃣  Testing /get-fingerprint");
    const getFingerprintResponse = await axiosWithAuth.get(
      `${API_URL}/get-fingerprint/${fingerprintId}`,
    );
    console.log("✅ Fingerprint retrieved:", getFingerprintResponse.data);

    // 6. Log a visit
    console.log("\n6️⃣  Testing /log-visit");
    const logVisitResponse = await axiosWithAuth.post(`${API_URL}/log-visit`, {
      fingerprintId,
      url: "https://test.com",
      title: "Test Page",
      timestamp: Date.now(),
    });
    console.log("✅ Visit logged:", logVisitResponse.data);

    // 7. Update presence
    console.log("\n7️⃣  Testing /update-presence");
    const updatePresenceResponse = await axiosWithAuth.post(`${API_URL}/update-presence`, {
      fingerprintId,
      status: "online",
      currentSites: ["https://test.com"],
    });
    console.log("✅ Presence updated:", updatePresenceResponse.data);

    // 8. Get reality stability index
    console.log("\n8️⃣  Testing /reality-stability");
    const stabilityResponse = await axiosWithAuth.get(`${API_URL}/reality-stability`);
    console.log("✅ Reality stability index:", stabilityResponse.data);

    // 9. Update tags
    console.log("\n9️⃣  Testing /update-tags");
    const updateTagsResponse = await axiosWithAuth.post(`${API_URL}/update-tags`, {
      fingerprintId,
      tags: {
        puzzle_solved: 5,
        mission_complete: 10,
      },
    });
    console.log("✅ Tags updated:", updateTagsResponse.data);

    // 10. Update roles by tags
    console.log("\n🔟 Testing /update-roles-by-tags");
    const updateRolesByTagsResponse = await axiosWithAuth.post(`${API_URL}/update-roles-by-tags`, {
      fingerprintId,
      tagRules: {
        puzzle_solved: "agent-initiate",
        mission_complete: "agent-field",
      },
    });
    console.log("✅ Roles updated by tags:", updateRolesByTagsResponse.data);

    // 11. Remove a role
    console.log("\n1️⃣1️⃣ Testing /remove-role");
    const removeRoleResponse = await axiosWithAuth.post(`${API_URL}/remove-role`, {
      fingerprintId,
      role: "agent-initiate" as PredefinedRole,
    });
    console.log("✅ Role removed:", removeRoleResponse.data);

    // 12. Remove a site
    console.log("\n1️⃣2️⃣ Testing /remove-site");
    const removeSiteResponse = await axiosWithAuth.post(`${API_URL}/remove-site`, {
      fingerprintId,
      siteId: "test-site",
    });
    console.log("✅ Site removed:", removeSiteResponse.data);

    console.log("\n✨ All endpoint tests completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Error during endpoint tests:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
  }
}

// Run the tests
testEndpoints();
