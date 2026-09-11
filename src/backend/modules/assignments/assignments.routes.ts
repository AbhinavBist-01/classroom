import { SubmissionController } from "../submissions/submissions.controller.js";
import { AssignmentController } from "./assignments.controller.js";
import { Router } from "express";

export const assignmentsRouter: Router = Router();

// POST /assignments/:id/accept - Student accepts assignment (queues repo generation)
assignmentsRouter.post("/:id/accept", SubmissionController.accept);

// GET /assignments/:id - View assignment details and tests
assignmentsRouter.get("/:id", AssignmentController.getById);

// PUT /assignments/:id - Update assignment details / tests (owner & ta)
assignmentsRouter.put("/:id", AssignmentController.update);

// GET /assignments/:id/submissions - View all student submissions (owner & ta)
assignmentsRouter.get("/:id/submissions", SubmissionController.listByAssignment);

// DELETE /assignments/:id - Delete assignment (owner only)
assignmentsRouter.delete("/:id", AssignmentController.delete);
