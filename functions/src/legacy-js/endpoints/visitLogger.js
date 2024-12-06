const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

exports.logVisit = async ({ fingerprintId, siteId, timestamp = Date.now() }) => {
  if (!fingerprintId || !siteId) {
    throw new Error("Missing required fields: fingerprintId and siteId are required");
  }

  const db = getFirestore();
  const visitsRef = db.collection("visits");
  const presenceRef = db.collection("presence").doc(fingerprintId);

  try {
    // Get current presence state
    const presenceDoc = await presenceRef.get();
    const currentSites = presenceDoc.exists ? presenceDoc.data().currentSites || [] : [];

    // Log the visit only if it's a new site
    if (!currentSites.includes(siteId)) {
      await visitsRef.add({
        fingerprintId,
        siteId,
        timestamp,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Update presence information
    await presenceRef.set(
      {
        fingerprintId,
        lastActive: timestamp,
        currentSites: FieldValue.arrayUnion(siteId),
        status: "online",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error in logVisit:", error);
    throw new Error("Failed to log visit and update presence");
  }
};

exports.updatePresence = async ({ fingerprintId, timestamp = Date.now() }) => {
  if (!fingerprintId) {
    throw new Error("Missing required field: fingerprintId");
  }

  const db = getFirestore();
  const presenceRef = db.collection("presence").doc(fingerprintId);

  try {
    await presenceRef.set(
      {
        lastActive: timestamp,
        status: "online",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error in updatePresence:", error);
    throw new Error("Failed to update presence");
  }
};

exports.removeSite = async ({ fingerprintId, siteId, timestamp = Date.now() }) => {
  if (!fingerprintId || !siteId) {
    throw new Error("Missing required fields: fingerprintId and siteId are required");
  }

  const db = getFirestore();
  const presenceRef = db.collection("presence").doc(fingerprintId);

  try {
    // Get current presence state
    const presenceDoc = await presenceRef.get();
    if (!presenceDoc.exists) {
      return; // No presence to update
    }

    const currentSites = presenceDoc.data().currentSites || [];
    const updatedSites = currentSites.filter((site) => site !== siteId);

    await presenceRef.update({
      currentSites: updatedSites,
      lastActive: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
      status: updatedSites.length === 0 ? "offline" : "online",
    });
  } catch (error) {
    console.error("Error in removeSite:", error);
    throw new Error("Failed to remove site and update presence");
  }
};

// Helper function to clean up stale presence
exports.cleanupStalePresence = async () => {
  const db = getFirestore();
  const presenceRef = db.collection("presence");
  const staleTimestamp = Date.now() - PRESENCE_TIMEOUT;

  try {
    const stalePresence = await presenceRef
      .where("lastActive", "<", staleTimestamp)
      .where("status", "==", "online")
      .get();

    const batch = db.batch();
    stalePresence.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "offline",
        currentSites: [],
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error in cleanupStalePresence:", error);
    throw new Error("Failed to cleanup stale presence");
  }
};
