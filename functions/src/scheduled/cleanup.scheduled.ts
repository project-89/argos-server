import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { cleanupData } from "../services/cleanup.service";

export const scheduledCleanup = onSchedule(
  {
    schedule: "every 24 hours",
    timeoutSeconds: 540,
    memory: "2GiB",
    region: "us-central1",
  },
  async (_event: ScheduledEvent): Promise<void> => {
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
