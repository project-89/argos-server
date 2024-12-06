const { getFirestore } = require("firebase-admin/firestore");

exports.getVisitedSites = async ({ fingerprintId }) => {
  if (!fingerprintId) {
    throw new Error("Missing fingerprintId");
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection("visits")
      .where("fingerprintId", "==", fingerprintId)
      .orderBy("timestamp", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  } catch (error) {
    if (error.code === 9 && error.message.includes("requires an index")) {
      console.error("Index required for this query. Please create the following index:");
      console.error("Collection: visits");
      console.error("Fields: fingerprintId (ASC), timestamp (DESC)");
      throw new Error("Database index not ready. Please try again in a few minutes.");
    }
    throw error;
  }
};
