import { Router } from "express";
import { GradesController } from "./grades.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const gradesRouter: Router = Router();

// GET /grades/workflow-template - Returns GitHub Actions workflow YAML
gradesRouter.get("/workflow-template", GradesController.getWorkflowTemplate);

// POST /grades/webhook - Ingests test runner results (Authenticated via Bearer CLASSROOM_GRADING_TOKEN)
gradesRouter.post("/webhook", GradesController.handleWebhook);

// GET /grades/:submissionId - Returns test result breakdown for a submission (Requires user session)
gradesRouter.get("/:submissionId", requireAuth, GradesController.getGrades);
