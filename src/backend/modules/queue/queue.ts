import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export interface RepoProvisionJobData {
  submission_id: number;
  classroom_id: number;
  assignment_id: number;
  student_id: string;
  student_username: string;
  template_repo: string;
  target_org: string;
  repo_name: string;
}

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    // Avoid infinite reconnection attempts if Redis is not running in local dev
    if (times > 2) return null;
    return Math.min(times * 1000, 3000);
  },
});

redisConnection.on("error", () => {
  // Suppress unhandled crash when Redis server is offline
});

export const repoProvisionQueue = new Queue<RepoProvisionJobData>("repo-provision", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

repoProvisionQueue.on("error", () => {
  // Suppress BullMQ unhandled EventEmitter error when Redis is offline
});

export interface GradingJobData {
  submission_id: number;
  assignment_id: number;
  student_id: string;
  github_repo: string;
  commit_sha: string;
}

export const gradingQueue = new Queue<GradingJobData>("grading", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

gradingQueue.on("error", () => {
  // Suppress BullMQ unhandled EventEmitter error when Redis is offline
});
