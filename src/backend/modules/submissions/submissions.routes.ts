import { Router } from "express";
import { SubmissionController } from "./submissions.controller.js";

export const submissionsRouter: Router = Router();

// GET /submissions/:id
submissionsRouter.get("/:id", SubmissionController.getById);
