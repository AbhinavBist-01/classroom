import type { Request, Response } from "express";
import { FeedbackService } from "./feedback.service.js";

export class FeedbackController {
  /**
   * POST /submissions/:id/feedback
   */
  static async create(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const submissionId = parseInt(rawId ?? "", 10);

    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    const { content } = req.body;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "Field 'content' is required as a string" });
      return;
    }

    try {
      const result = await FeedbackService.createFeedback(submissionId, req.user!.id, content);
      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }
      if (result.status === "forbidden") {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.status === "bad_request") {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(201).json(result.feedback);
    } catch (err) {
      console.error("[FeedbackController:create] Error:", err);
      res.status(500).json({ error: "Failed to create feedback" });
    }
  }

  /**
   * GET /submissions/:id/feedback
   */
  static async list(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const submissionId = parseInt(rawId ?? "", 10);

    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    try {
      const result = await FeedbackService.getFeedback(submissionId, req.user!.id);
      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }
      if (result.status === "forbidden") {
        res.status(403).json({ error: result.error });
        return;
      }

      res.status(200).json(result.feedback);
    } catch (err) {
      console.error("[FeedbackController:list] Error:", err);
      res.status(500).json({ error: "Failed to retrieve feedback" });
    }
  }
}
