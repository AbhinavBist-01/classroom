import "dotenv/config";
import { startRepoProvisionWorker } from "./repo-worker.js";
import { startGradingWorker } from "./grading-worker.js";

console.log("==========================================");
console.log("   Classroom Distributed Worker Service   ");
console.log("==========================================");

const repoWorker = startRepoProvisionWorker();
const gradingWorker = startGradingWorker();

console.log("[Workers] BullMQ workers initialized and listening on Redis queues:");
console.log("  - 'repo-provision' queue (concurrency: 5)");
console.log("  - 'grading' queue (concurrency: 5)");

// Handle graceful termination
const shutdown = async (signal: string) => {
  console.log(`\n[Workers] Received ${signal}. Gracefully closing workers...`);
  await Promise.all([repoWorker.close(), gradingWorker.close()]);
  console.log("[Workers] All workers shut down cleanly.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
