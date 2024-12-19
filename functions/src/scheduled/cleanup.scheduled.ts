import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

export const scheduledCleanup = onSchedule(
  {
    schedule: "0 0 * * *", // Run at midnight every day
    timeZone: "UTC",
    retryCount: 3,
    memory: "256MiB",
  },
  async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    try {
      // Delete visits older than 30 days
      const visitsRef = db.collection("visits");
      const oldVisits = await visitsRef.where("timestamp", "<", thirtyDaysAgo).get();

      const batch = db.batch();
      oldVisits.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Successfully cleaned up ${oldVisits.size} old visits`);
    } catch (error) {
      console.error("Error during scheduled cleanup:", error);
      throw error;
    }
  },
);
