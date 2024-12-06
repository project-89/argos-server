const { getFirestore } = require("firebase-admin/firestore");

const predefinedRoles = ["user", "agent-initiate", "agent-field", "agent-senior", "agent-master"];

exports.assignRole = async ({ fingerprintId }) => {
  if (!fingerprintId) {
    throw new Error("Invalid request. Provide fingerprintId.");
  }

  const db = getFirestore();
  const fingerprintRef = db.collection("fingerprints").doc(fingerprintId);
  const doc = await fingerprintRef.get();

  if (!doc.exists) {
    throw new Error("Fingerprint not found.");
  }

  const data = doc.data();
  let roles = data.roles || [];
  roles = Array.from(new Set(roles)).filter((role) => predefinedRoles.includes(role));

  await fingerprintRef.set({ roles }, { merge: true });
  return roles;
};

exports.getAvailableRoles = async () => {
  const db = getFirestore();
  const rolesSnapshot = await db.collection("roles").get();
  return rolesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
