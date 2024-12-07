import { onSchedule } from "firebase-functions/v2/scheduler";
import { cleanupData } from "../services/cleanup.service";

export const scheduledCleanup = onSchedule(
  {
    schedule: "every 24 hours",
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "us-central1",
  },
  async (event) => {
    console.log(`Starting scheduled cleanup at ${new Date().toISOString()}`);

    try {
      await cleanupData();
      console.log("Scheduled cleanup completed successfully");
    } catch (error) {
      console.error("Error in scheduled cleanup:", error);
      throw error;
    }
  },
);
