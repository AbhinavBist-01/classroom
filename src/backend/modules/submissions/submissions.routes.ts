import { Router } from "express";
import { SubmissionController } from "./submissions.controller.js";
import { FeedbackController } from "../feedback/feedback.controller.js";

export const submissionsRouter: Router = Router();

// GET /submissions/:id
submissionsRouter.get("/:id", SubmissionController.getById);

// POST /submissions/:id/regrade
submissionsRouter.post("/:id/regrade", SubmissionController.regrade);

// Feedback Endpoints (Phase 14)
// POST /submissions/:id/feedback - Instructor leaves review comments
submissionsRouter.post("/:id/feedback", FeedbackController.create);

// GET /submissions/:id/feedback - View review comments
submissionsRouter.get("/:id/feedback", FeedbackController.list);

