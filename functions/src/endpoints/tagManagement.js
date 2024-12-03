const { getFirestore } = require("firebase-admin/firestore");

exports.addOrUpdateTags = async ({ fingerprintId, tags }) => {
  if (!fingerprintId || !tags || typeof tags !== "object") {
    throw new Error("Invalid request. Provide fingerprintId and tags object.");
  }

  const db = getFirestore();
  const fingerprintRef = db.collection("fingerprints").doc(fingerprintId);
  await fingerprintRef.set({ tags }, { merge: true });

  return true;
};

exports.updateRolesBasedOnTags = async ({ fingerprintId }) => {
  if (!fingerprintId) {
    throw new Error("Missing fingerprintId");
  }

  const db = getFirestore();
  const fingerprintRef = db.collection("fingerprints").doc(fingerprintId);
  const doc = await fingerprintRef.get();

  if (!doc.exists) {
    throw new Error("Fingerprint not found");
  }

  const data = doc.data();
  let roles = data.roles || [];

  // TODO: Add dynamic role logic here
  console.log("TODO: Add dynamic role logic here", roles);

  await fingerprintRef.set({ roles }, { merge: true });
  return roles;
};
