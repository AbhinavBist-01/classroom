import type { Request, Response } from "express";
import { ClassroomService } from "./classrooms.service.js";

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

export class ClassroomController {
  /**
   * POST /classrooms
   */
  static async create(req: Request, res: Response): Promise<void> {
    const { name, github_org } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Classroom 'name' is required" });
      return;
    }

    if (!github_org || typeof github_org !== "string" || !github_org.trim()) {
      res.status(400).json({ error: "GitHub organization 'github_org' is required" });
      return;
    }

    try {
      const classroom = await ClassroomService.createClassroom({
        name: name.trim(),
        github_org: github_org.trim(),
        owner_id: req.user!.id,
      });

      res.status(201).json({
        ...classroom,
        join_url: `${clientUrl}/join/${classroom.invite_code}`,
      });
    } catch {
      res.status(500).json({ error: "Failed to create classroom" });
    }
  }

  /**
   * GET /classrooms
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const classrooms = await ClassroomService.listUserClassrooms(req.user!.id);
      res.json(classrooms);
    } catch {
      res.status(500).json({ error: "Failed to list classrooms" });
    }
  }

  /**
   * GET /classrooms/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    try {
      const details = await ClassroomService.getClassroomById(classroomId);
      if (!details) {
        res.status(404).json({ error: "Classroom not found" });
        return;
      }

      res.json({
        ...details,
        join_url: `${clientUrl}/join/${details.invite_code}`,
        current_user_role: req.classroomRole,
      });
    } catch {
      res.status(500).json({ error: "Failed to retrieve classroom details" });
    }
  }

  /**
   * GET /classrooms/:id/students
   */
  static async getStudents(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    try {
      const students = await ClassroomService.getClassroomStudents(classroomId);
      res.json(students);
    } catch {
      res.status(500).json({ error: "Failed to fetch student roster" });
    }
  }

  /**
   * GET /classrooms/:id/members
   */
  static async getMembers(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    try {
      const members = await ClassroomService.getClassroomMembers(classroomId);
      res.json(members);
    } catch {
      res.status(500).json({ error: "Failed to fetch classroom members" });
    }
  }

  /**
   * POST /classrooms/:id/regenerate-invite
   */
  static async regenerateInvite(req: Request, res: Response): Promise<void> {
    const classroomId = req.classroom!.id;
    try {
      const updated = await ClassroomService.regenerateInviteCode(classroomId);
      if (!updated) {
        res.status(404).json({ error: "Classroom not found" });
        return;
      }

      res.json({
        invite_code: updated.invite_code,
        join_url: `${clientUrl}/join/${updated.invite_code}`,
      });
    } catch {
      res.status(500).json({ error: "Failed to regenerate invite code" });
    }
  }

  /**
   * GET /classrooms/join/:code
   */
  static async previewJoin(req: Request, res: Response): Promise<void> {
    const rawParam = req.params.code;
    const code = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!code || !code.trim()) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    try {
      const classroom = await ClassroomService.getClassroomByInviteCode(code);
      if (!classroom) {
        res.status(404).json({ error: "Invalid or expired invite code" });
        return;
      }

      res.json(classroom);
    } catch {
      res.status(500).json({ error: "Failed to preview classroom" });
    }
  }

  /**
   * POST /classrooms/join/:code
   */
  static async join(req: Request, res: Response): Promise<void> {
    const rawParam = req.params.code;
    const code = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!code || !code.trim()) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    try {
      const result = await ClassroomService.joinClassroomByCode(code, req.user!.id);
      if (result.status === "not_found") {
        res.status(404).json({ error: "Invalid or expired invite code" });
        return;
      }

      if (result.status === "already_enrolled") {
        res.status(200).json({
          message: "You are already enrolled in this classroom",
          role: result.role,
          classroom: result.classroom,
        });
        return;
      }

      res.status(201).json({
        message: "Successfully joined classroom",
        role: result.role,
        classroom: result.classroom,
      });
    } catch {
      res.status(500).json({ error: "Failed to join classroom" });
    }
  }
}
