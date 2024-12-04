import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { CACHE_CONFIG } from "../constants";

/**
 * Cleans up expired cache entries from Firestore
 */
export const cleanupCache = async (): Promise<void> => {
  const db = getFirestore();
  const now = Date.now();
  const cutoff = now - CACHE_CONFIG.MAX_AGE;

  // Get all expired cache entries
  const snapshot = await db
    .collection(COLLECTIONS.PRICE_CACHE)
    .where("timestamp", "<", cutoff)
    .get();

  if (snapshot.empty) {
    return;
  }

  // Delete expired entries in batches
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
