import type { Request, Response } from "express";
import { AssignmentService } from "./assignments.service.js";

export class AssignmentController {
  /**
   * POST /classrooms/:id/assignments
   */
  static async create(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    const {
      title,
      description,
      deadline,
      template_repo,
      max_score,
      visibility,
      tests,
    } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Assignment 'title' is required" });
      return;
    }

    if (!description || typeof description !== "string") {
      res.status(400).json({ error: "Assignment 'description' is required" });
      return;
    }

    if (!deadline || typeof deadline !== "string") {
      res.status(400).json({ error: "Assignment 'deadline' date string is required (YYYY-MM-DD)" });
      return;
    }

    if (!template_repo || typeof template_repo !== "string" || !template_repo.trim()) {
      res.status(400).json({ error: "Assignment 'template_repo' (e.g. org/repo-template) is required" });
      return;
    }

    try {
      const assignment = await AssignmentService.createAssignment({
        classroom_id: classroomId,
        title: title.trim(),
        description: description.trim(),
        deadline: deadline.trim(),
        template_repo: template_repo.trim(),
        max_score: typeof max_score === "number" ? max_score : undefined,
        visibility: visibility === "public" ? "public" : "private",
        tests: Array.isArray(tests) ? tests : [],
      });

      res.status(201).json(assignment);
    } catch {
      res.status(500).json({ error: "Failed to create assignment" });
    }
  }

  /**
   * GET /classrooms/:id/assignments
   */
  static async listByClassroom(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    const role = req.classroomRole || "student";

    try {
      const assignments = await AssignmentService.listByClassroom(classroomId, role);
      res.json(assignments);
    } catch {
      res.status(500).json({ error: "Failed to list assignments" });
    }
  }

  /**
   * GET /assignments/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignmentId = parseInt(rawId ?? "", 10);

    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment ID" });
      return;
    }

    try {
      // Resolve user's access & role for this assignment's classroom
      const access = await AssignmentService.resolveUserRoleForAssignment(
        assignmentId,
        req.user!.id
      );

      if (!access) {
        res.status(403).json({ error: "Forbidden: Not enrolled in this assignment's classroom" });
        return;
      }

      const assignment = await AssignmentService.getById(assignmentId, access.role);
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      res.json({
        ...assignment,
        current_user_role: access.role,
      });
    } catch {
      res.status(500).json({ error: "Failed to retrieve assignment details" });
    }
  }

  /**
   * PUT /assignments/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignmentId = parseInt(rawId ?? "", 10);

    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment ID" });
      return;
    }

    try {
      const access = await AssignmentService.resolveUserRoleForAssignment(
        assignmentId,
        req.user!.id
      );

      if (!access || (access.role !== "owner" && access.role !== "ta")) {
        res.status(403).json({ error: "Forbidden: Only classroom instructors/TAs can edit assignments" });
        return;
      }

      const updated = await AssignmentService.updateAssignment(assignmentId, req.body);
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update assignment" });
    }
  }

  /**
   * DELETE /assignments/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignmentId = parseInt(rawId ?? "", 10);

    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment ID" });
      return;
    }

    try {
      const access = await AssignmentService.resolveUserRoleForAssignment(
        assignmentId,
        req.user!.id
      );

      if (!access || access.role !== "owner") {
        res.status(403).json({ error: "Forbidden: Only the classroom owner can delete assignments" });
        return;
      }

      const deleted = await AssignmentService.deleteAssignment(assignmentId);
      if (!deleted) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      res.json({ message: "Assignment deleted successfully" });
    } catch {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  }
}
