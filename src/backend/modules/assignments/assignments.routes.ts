import { Router } from "express";
import { AssignmentController } from "./assignments.controller.js";

export const assignmentsRouter: Router = Router();

// GET /assignments/:id - View assignment details and tests
assignmentsRouter.get("/:id", AssignmentController.getById);

// PUT /assignments/:id - Update assignment details / tests (owner & ta)
assignmentsRouter.put("/:id", AssignmentController.update);

// DELETE /assignments/:id - Delete assignment (owner only)
assignmentsRouter.delete("/:id", AssignmentController.delete);
