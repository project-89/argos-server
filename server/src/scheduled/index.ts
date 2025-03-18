import cron from "node-cron";
import { cleanupService } from "../services/cleanup.service";

/**
 * Setup all scheduled tasks
 */
export function setupScheduledTasks() {
  console.log("[Scheduler] Setting up scheduled tasks");

  // Daily cleanup at midnight UTC
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log("[Scheduled Cleanup] Starting daily cleanup...");
        const result = await cleanupService();
        console.log("[Scheduled Cleanup] Cleanup completed:", result);
      } catch (error) {
        console.error("[Scheduled Cleanup] Error during scheduled cleanup:", error);
      }
    },
    {
      timezone: "UTC",
    },
  );

  console.log("[Scheduler] Scheduled tasks setup complete");
}
