import type { Request, Response } from "express";
import { GradesService, type IngestGradesPayload } from "./grades.service.js";

export class GradesController {
  /**
   * GET /grades/:submissionId
   * Retrieves test run results breakdown
   */
  static async getGrades(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.submissionId)
      ? req.params.submissionId[0]
      : req.params.submissionId;
    const submissionId = parseInt(rawId ?? "", 10);

    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    try {
      const result = await GradesService.getGradesBySubmission(submissionId, req.user!.id);

      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }

      if (result.status === "forbidden") {
        res.status(403).json({ error: result.error });
        return;
      }

      res.status(200).json(result.grades);
    } catch (err) {
      console.error("[GradesController:getGrades] Error:", err);
      res.status(500).json({ error: "Failed to retrieve grade details" });
    }
  }

  /**
   * POST /grades/webhook
   * Ingests test run results reported by GitHub Actions runner or external sandbox
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;

    // Verify grading token
    if (!GradesService.verifyGradingToken(authHeader)) {
      res.status(401).json({ error: "Unauthorized: Invalid or missing grading token" });
      return;
    }

    const payload = req.body as IngestGradesPayload;

    if (!payload || typeof payload.submission_id !== "number" || !Array.isArray(payload.results)) {
      res.status(400).json({
        error: "Invalid payload format. Expected { submission_id: number, results: Array }",
      });
      return;
    }

    try {
      const result = await GradesService.ingestGrades(payload);

      if (result.status === "not_found") {
        res.status(404).json({ error: result.error });
        return;
      }

      res.status(200).json({
        message: "Grades successfully recorded",
        submission_id: result.submission_id,
        score: result.score,
        tests_graded: result.tests_graded,
      });
    } catch (err) {
      console.error("[GradesController:handleWebhook] Error:", err);
      res.status(500).json({ error: "Failed to ingest grades" });
    }
  }

  /**
   * GET /grades/workflow-template
   * Helper endpoint returning GitHub Actions workflow YAML
   */
  static async getWorkflowTemplate(req: Request, res: Response): Promise<void> {
    const apiUrl = (req.query.api_url as string) || "http://localhost:5000";
    const template = GradesService.generateWorkflowTemplate(apiUrl);
    res.type("text/yaml").send(template);
  }
}
