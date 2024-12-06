import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

// Constants for cleanup thresholds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const cleanupData = async (
  shouldError = false,
): Promise<{ deletedVisits: number; deletedPresence: number }> => {
  try {
    // If shouldError is true, throw an error for testing
    if (shouldError) {
      throw new Error("Simulated error for testing");
    }

    const db = getFirestore();
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    // Delete old visits
    const visitsSnapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    const batch = db.batch();
    visitsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete old presence records
    const presenceSnapshot = await db
      .collection(COLLECTIONS.PRESENCE)
      .where("lastUpdated", "<", thirtyDaysAgo)
      .get();

    presenceSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return {
      deletedVisits: visitsSnapshot.size,
      deletedPresence: presenceSnapshot.size,
    };
  } catch (error) {
    console.error("Error in cleanup service:", error);
    throw error;
  }
};

export const cleanupRateLimits = async (identifier: string): Promise<void> => {
  const db = getFirestore();
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  try {
    const rateLimitRef = db.collection("rateLimits").doc(identifier);
    const doc = await rateLimitRef.get();

    if (doc.exists) {
      const currentRequests = doc.data()?.requests || [];
      const updatedRequests = currentRequests.filter((timestamp: number) => timestamp > oneHourAgo);

      if (updatedRequests.length !== currentRequests.length) {
        await rateLimitRef.update({
          requests: updatedRequests,
          lastUpdated: now,
        });
      }
    }
  } catch (error) {
    console.error(`Error cleaning up rate limits for ${identifier}:`, error);
    throw error;
  }
};
