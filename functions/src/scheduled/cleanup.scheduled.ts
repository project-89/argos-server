import { onSchedule } from "firebase-functions/v2/scheduler";
import { cleanupService } from "../services/cleanup.service";

export const scheduledCleanup = onSchedule(
  {
    schedule: "0 0 * * *", // Run at midnight every day
    timeZone: "UTC",
    retryCount: 3,
    memory: "256MiB",
    region: "us-central1",
    maxInstances: 1,
    timeoutSeconds: 540,
    labels: {
      deployment: "production",
    },
  },
  async (event) => {
    try {
      console.log("[Scheduled Cleanup] Starting daily cleanup...");
      const result = await cleanupService();
      console.log("[Scheduled Cleanup] Cleanup completed:", result);
    } catch (error) {
      console.error("[Scheduled Cleanup] Error during scheduled cleanup:", error);
      throw error;
    }
  },
);
