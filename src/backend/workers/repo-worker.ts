import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissionsTable } from "../db/schema.js";
import { getOrgOctokit, isGithubAppConfigured } from "../modules/github/github-app.js";
import { redisConnection, type RepoProvisionJobData } from "../modules/queue/queue.js";

/**
 * Handles the provisioning of student assignment repositories from template
 */
export async function processRepoProvisionJob(job: Job<RepoProvisionJobData>): Promise<void> {
  const {
    submission_id,
    template_repo,
    target_org,
    repo_name,
    student_username,
  } = job.data;

  console.log(`[Worker:RepoProvision] Starting provisioning for submission #${submission_id}: ${target_org}/${repo_name}`);

  try {
    // 1. Update status to provisioning
    await db
      .update(submissionsTable)
      .set({ status: "provisioning" })
      .where(eq(submissionsTable.id, submission_id));

    const fullRepoName = `${target_org}/${repo_name}`;

    if (isGithubAppConfigured) {
      // 2. Obtain Octokit instance authenticated for the target organization
      const orgOctokit = await getOrgOctokit(target_org);

      // Parse template repo owner and name (e.g. 'teacher-org/binary-search-template')
      const [templateOwner, templateName] = template_repo.split("/");
      if (!templateOwner || !templateName) {
        throw new Error(`Invalid template_repo format: '${template_repo}'. Expected 'owner/repo'.`);
      }

      // 3. Create repository from template
      console.log(`[Worker:RepoProvision] Generating repo from template: ${template_repo} -> ${fullRepoName}`);
      await orgOctokit.rest.repos.createUsingTemplate({
        template_owner: templateOwner,
        template_repo: templateName,
        owner: target_org,
        name: repo_name,
        private: true,
        description: `Classroom assignment for @${student_username}`,
      });

      // 4. Grant push permission to student collaborator
      if (student_username && student_username !== "anonymous") {
        console.log(`[Worker:RepoProvision] Adding collaborator @${student_username} to ${fullRepoName}`);
        await orgOctokit.rest.repos.addCollaborator({
          owner: target_org,
          repo: repo_name,
          username: student_username,
          permission: "push",
        });
      }
    } else {
      console.warn(
        `[Worker:RepoProvision] GitHub App is not configured. Simulating successful provisioning for development: ${fullRepoName}`
      );
    }

    // 5. Mark submission as ready
    await db
      .update(submissionsTable)
      .set({
        github_repo: fullRepoName,
        status: "ready",
      })
      .where(eq(submissionsTable.id, submission_id));

    console.log(`[Worker:RepoProvision] Successfully provisioned: ${fullRepoName} (Submission #${submission_id})`);
  } catch (error) {
    console.error(`[Worker:RepoProvision] Error provisioning submission #${submission_id}:`, error);

    // Mark submission as failed
    await db
      .update(submissionsTable)
      .set({ status: "failed" })
      .where(eq(submissionsTable.id, submission_id));

    throw error;
  }
}

/**
 * Creates and starts the BullMQ repo provisioning worker instance
 */
export function startRepoProvisionWorker(): Worker<RepoProvisionJobData> {
  const worker = new Worker<RepoProvisionJobData>(
    "repo-provision",
    processRepoProvisionJob,
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker:RepoProvision] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:RepoProvision] Job ${job?.id} failed:`, err);
  });

  return worker;
}
