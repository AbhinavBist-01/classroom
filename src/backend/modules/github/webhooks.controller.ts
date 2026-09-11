import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { submissionsTable } from "../../db/schema.js";
import { verifyGithubWebhookSignature } from "./github-app.js";
import { gradingQueue } from "../queue/queue.js";

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

export class WebhooksController {
  /**
   * Handles incoming GitHub webhooks (Ping, Push, etc.)
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const event = (req.headers["x-github-event"] as string | undefined) || "unknown";

    // 1. Verify HMAC SHA-256 signature if secret is configured
    if (webhookSecret) {
      if (!signature) {
        res.status(401).json({ error: "Missing X-Hub-Signature-256 header" });
        return;
      }

      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const isValid = verifyGithubWebhookSignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        console.warn("[Webhook] Invalid HMAC signature rejected");
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    } else {
      console.warn("[Webhook] Warning: GITHUB_WEBHOOK_SECRET not set; running in permissive dev mode");
    }

    // 2. Handle GitHub Ping event (Initial webhook verification)
    if (event === "ping") {
      const zen = req.body?.zen || "Keep it logically awesome.";
      const hookId = req.body?.hook_id;
      console.log(`[Webhook] Ping received (Hook ID: ${hookId}): ${zen}`);
      res.status(200).json({
        ok: true,
        message: "pong",
        zen,
        hook_id: hookId,
      });
      return;
    }

    // 3. Handle Push event (Student pushed code to repo)
    if (event === "push") {
      const payload = req.body;
      const repoFullName = payload?.repository?.full_name;
      const commitSha = payload?.after;
      const ref = payload?.ref;
      const pusher = payload?.pusher?.name || "unknown";

      console.log(
        `[Webhook] Push event on ${repoFullName} (${ref}) by ${pusher}, commit: ${commitSha}`
      );

      // Ignore branch deletion events (after = 000000...)
      if (!commitSha || commitSha === "0000000000000000000000000000000000000000") {
        res.status(200).json({ received: true, ignored: "branch_deleted" });
        return;
      }

      // Find matching submission record by github_repo
      if (repoFullName) {
        try {
          const [submission] = await db
            .select()
            .from(submissionsTable)
            .where(eq(submissionsTable.github_repo, repoFullName))
            .limit(1);

          if (submission) {
            // Update submission with latest commit SHA & reset status to pending for grading
            await db
              .update(submissionsTable)
              .set({
                commit_sha: commitSha,
                status: "pending",
                submitted_at: new Date(),
              })
              .where(eq(submissionsTable.id, submission.id));

            // Queue autograding job
            try {
              await gradingQueue.add("grade", {
                submission_id: submission.id,
                assignment_id: submission.assignment_id,
                student_id: submission.student_id,
                github_repo: repoFullName,
                commit_sha: commitSha,
              });
              console.log(
                `[Webhook] Enqueued grading job for submission #${submission.id} at commit ${commitSha}`
              );
            } catch (qErr) {
              console.warn(
                "[Webhook] Could not enqueue grading job (Redis offline?):",
                (qErr as Error).message
              );
            }
          } else {
            console.log(`[Webhook] No active submission found matching repository: ${repoFullName}`);
          }
        } catch (dbErr) {
          console.error("[Webhook] Error updating submission on push:", dbErr);
        }
      }

      // Fast 200 OK acknowledgment to GitHub within < 50ms
      res.status(200).json({
        received: true,
        event: "push",
        repo: repoFullName,
        commit_sha: commitSha,
      });
      return;
    }

    // Default handler for other subscribed events (repository, installation, etc.)
    res.status(200).json({
      received: true,
      event,
    });
  }
}
