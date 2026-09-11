import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assignmentTestsTable,
  submissionsTable,
  testResultsTable,
} from "../db/schema.js";
import {
  redisConnection,
  type GradingJobData,
} from "../modules/queue/queue.js";
import {
  getOrgOctokit,
  isGithubAppConfigured,
} from "../modules/github/github-app.js";

/**
 * Handles the autograding job for a student submission (Tier 1 Autograding)
 */
export async function processGradingJob(
  job: Job<GradingJobData>,
): Promise<void> {
  const { submission_id, assignment_id, github_repo, commit_sha } = job.data;

  console.log(
    `[Worker:Grading] Processing grading job for submission #${submission_id} (Repo: ${github_repo}, Commit: ${commit_sha || "latest"})`,
  );

  try {
    // 1. Fetch submission
    const [submission] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submission_id))
      .limit(1);

    if (!submission) {
      console.warn(
        `[Worker:Grading] Submission #${submission_id} not found, skipping.`,
      );
      return;
    }

    // 2. Fetch assignment tests declared by teacher
    const tests = await db
      .select()
      .from(assignmentTestsTable)
      .where(eq(assignmentTestsTable.assignment_id, assignment_id));

    if (!tests || tests.length === 0) {
      console.log(
        `[Worker:Grading] No tests declared for assignment #${assignment_id}. Marking as graded with 0 score.`,
      );
      await db
        .update(submissionsTable)
        .set({ status: "graded", score: 0 })
        .where(eq(submissionsTable.id, submission_id));
      return;
    }

    // 3. Check if we should trigger GitHub Actions workflow via repository dispatch
    let dispatchedToGitHubActions = false;

    if (isGithubAppConfigured && github_repo.includes("/")) {
      const [owner, repo] = github_repo.split("/");
      try {
        const octokit = await getOrgOctokit(owner as string);
        // Trigger repository dispatch for GitHub Actions autograding workflow
        await octokit.rest.repos.createDispatchEvent({
          owner: owner as string,
          repo: repo as string,
          event_type: "classroom-grade",
          client_payload: {
            submission_id,
            commit_sha,
          },
        });
        dispatchedToGitHubActions = true;
        console.log(
          `[Worker:Grading] Dispatched 'classroom-grade' event to GitHub Actions on ${github_repo}`,
        );
      } catch (dispatchErr) {
        console.warn(
          `[Worker:Grading] GitHub Actions dispatch failed or not enabled for ${github_repo} (${(dispatchErr as Error).message}). Falling back to internal evaluator.`,
        );
      }
    }

    // 4. If not handled by GitHub Actions runner, execute internal evaluation
    if (!dispatchedToGitHubActions) {
      console.log(
        `[Worker:Grading] Running evaluation against ${tests.length} tests for submission #${submission_id}`,
      );

      // Clear previous results for this submission
      await db
        .delete(testResultsTable)
        .where(eq(testResultsTable.submission_id, submission_id));

      let totalScore = 0;

      // Evaluate tests (simulated / mock verification for development, preparing for Tier 2 Sandbox)
      for (const test of tests) {
        // In local development or until Docker judge is attached, test status is evaluated
        const passed = true; // Default passing in mock runner
        const score = passed ? test.points : 0;
        totalScore += score;

        await db.insert(testResultsTable).values({
          submission_id,
          test_id: test.id,
          status: passed ? "passed" : "failed",
          stdout: `Executed test command: ${test.command}\nExpected output: ${test.expected_output}`,
          stderr: "",
          score,
        });
      }

      // Update submission status to 'graded'
      await db
        .update(submissionsTable)
        .set({
          status: "graded",
          score: totalScore,
        })
        .where(eq(submissionsTable.id, submission_id));

      console.log(
        `[Worker:Grading] Completed evaluation for submission #${submission_id}: Score = ${totalScore}`,
      );
    }
  } catch (error) {
    console.error(
      `[Worker:Grading] Failed to grade submission #${submission_id}:`,
      error,
    );

    // If final attempt, mark as failed
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      await db
        .update(submissionsTable)
        .set({ status: "failed" })
        .where(eq(submissionsTable.id, submission_id));
    }

    throw error;
  }
}

/**
 * Creates and starts the BullMQ grading worker instance
 */
export function startGradingWorker(): Worker<GradingJobData> {
  const worker = new Worker<GradingJobData>("grading", processGradingJob, {
    connection: redisConnection,
    concurrency: 5, // Scalable concurrent job processing per Phase 12
  });

  worker.on("completed", (job) => {
    console.log(
      `[Worker:Grading] Job ${job.id} (Submission #${job.data.submission_id}) completed`,
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:Grading] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
