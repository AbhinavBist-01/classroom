import type { Request, Response } from "express";
import { SubmissionService } from "./submissions.service.js";

export class SubmissionController {
  /**
   * POST /assignments/:id/accept
   * Student accepts assignment -> triggers repo provisioning in background
   */
  static async accept(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignmentId = parseInt(rawId ?? "", 10);

    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment ID" });
      return;
    }

    try {
      const result = await SubmissionService.acceptAssignment(assignmentId, req.user!.id);

      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }

      if (result.status === "forbidden") {
        res.status(403).json({ error: result.error });
        return;
      }

      if (result.status === "already_ready") {
        res.status(200).json({
          message: "Repository is already provisioned and ready",
          submission: result.submission,
        });
        return;
      }

      // 202 Accepted: Provisioning is queued / in progress asynchronously
      res.status(202).json({
        message: "Repository is being provisioned in the background",
        status: result.submission.status,
        submission: result.submission,
      });
    } catch {
      res.status(500).json({ error: "Failed to process assignment acceptance" });
    }
  }

  /**
   * GET /submissions/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const submissionId = parseInt(rawId ?? "", 10);

    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    try {
      const submission = await SubmissionService.getSubmission(submissionId, req.user!.id);
      if (!submission) {
        res.status(404).json({ error: "Submission not found or access denied" });
        return;
      }

      res.json(submission);
    } catch {
      res.status(500).json({ error: "Failed to retrieve submission" });
    }
  }

  /**
   * POST /submissions/:id/regrade
   */
  static async regrade(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const submissionId = parseInt(rawId ?? "", 10);

    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    try {
      const result = await SubmissionService.regradeSubmission(submissionId, req.user!.id);
      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }

      res.status(202).json(result);
    } catch {
      res.status(500).json({ error: "Failed to trigger regrading" });
    }
  }
}
