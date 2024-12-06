const { getFirestore } = require("firebase-admin/firestore");
const { FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

exports.createApiKey = async (name, fingerprintId, metadata = {}) => {
  const db = getFirestore();

  const existingKeys = await db
    .collection("apiKeys")
    .where("fingerprintId", "==", fingerprintId)
    .get();

  if (!existingKeys.empty) {
    throw new Error("Fingerprint already has an associated API key");
  }

  const key = crypto.randomBytes(32).toString("hex");

  const keyExists = await db.collection("apiKeys").doc(key).get();
  if (keyExists.exists) {
    return exports.createApiKey(name, fingerprintId, metadata);
  }

  const keyDoc = {
    name,
    key: key,
    fingerprintId,
    createdAt: FieldValue.serverTimestamp(),
    lastUsed: null,
    enabled: true,
    metadata,
    usageCount: 0,
    endpointStats: {
      price: 0,
      prices: 0,
    },
  };

  await db.runTransaction(async (transaction) => {
    const fingerprintRef = db.collection("fingerprints").doc(fingerprintId);
    const fingerprintDoc = await transaction.get(fingerprintRef);

    if (!fingerprintDoc.exists) {
      throw new Error("Fingerprint not found");
    }

    if ((fingerprintDoc.data().apiKeys || []).includes(key)) {
      throw new Error("Fingerprint already has this API key");
    }

    transaction.set(db.collection("apiKeys").doc(key), keyDoc);

    transaction.update(fingerprintRef, {
      apiKeys: FieldValue.arrayUnion(key),
    });
  });

  return key;
};

exports.validateApiKey = async (key, endpoint) => {
  const db = getFirestore();

  const keyDoc = await db.collection("apiKeys").doc(key).get();

  if (!keyDoc.exists || !keyDoc.data().enabled) {
    return {
      isValid: false,
    };
  }

  const data = keyDoc.data();

  await keyDoc.ref.update({
    lastUsed: FieldValue.serverTimestamp(),
    usageCount: FieldValue.increment(1),
    [`endpointStats.${endpoint}`]: FieldValue.increment(1),
  });

  return {
    isValid: true,
    fingerprintId: data.fingerprintId,
  };
};
