const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { updateRolesBasedOnTags } = require("../endpoints/tagManagement");

// Export the function directly to be picked up by Firebase Functions
exports.autoUpdateRolesOnTagChange = onDocumentUpdated(
  "fingerprints/{fingerprintId}",
  async (event) => {
    try {
      const beforeData = event.before && event.before.data();
      const afterData = event.after && event.after.data();

      if (!beforeData || !afterData) {
        console.log("Missing data in event:", { beforeData, afterData });
        return null;
      }

      if (JSON.stringify(beforeData.tags) === JSON.stringify(afterData.tags)) {
        console.log("Tags have not changed, skipping update");
        return null;
      }

      const pathSegments = event.before._ref._path.segments;
      const fingerprintId = pathSegments[pathSegments.length - 1];

      console.log(`Processing tags for fingerprint ${fingerprintId}:`, afterData.tags);

      await updateRolesBasedOnTags({ fingerprintId });

      console.log("Successfully processed tag change");
      return null;
    } catch (error) {
      console.error("Error in autoUpdateRolesOnTagChange:", error);
      return null;
    }
  },
);
