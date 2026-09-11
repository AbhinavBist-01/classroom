import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/index.js";
import { classroomMembersTable, classroomsTable } from "../db/schema.js";
import type { Session, User } from "../lib/auth.js";

// Extend Express Request types for TypeScript auto-completion
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session["session"];
      classroomRole?: "owner" | "ta" | "student";
      classroom?: typeof classroomsTable.$inferSelect;
      rawBody?: Buffer;
    }
  }
}

/**
 * Middleware: Requires the user to have a platform-level role (e.g., 'admin')
 */
export const requirePlatformRole = (allowedRoles: ("user" | "admin")[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userRole = (req.user.role as "user" | "admin") || "user";
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: "Forbidden: Insufficient platform permissions" });
      return;
    }

    next();
  };
};

/**
 * Middleware: Requires the user to belong to a classroom with one of the allowed roles ('owner', 'ta', 'student')
 */
export const requireClassroomRole = (allowedRoles: ("owner" | "ta" | "student")[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawParam = req.params.classroomId || req.params.id;
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    const classroomId = parseInt(rawId ?? "", 10);

    if (isNaN(classroomId)) {
      res.status(400).json({ error: "Invalid classroom ID parameter" });
      return;
    }

    try {
      // 1. Fetch classroom
      const [classroom] = await db
        .select()
        .from(classroomsTable)
        .where(eq(classroomsTable.id, classroomId))
        .limit(1);

      if (!classroom) {
        res.status(404).json({ error: "Classroom not found" });
        return;
      }

      req.classroom = classroom;

      // 2. Check if user is the direct owner
      if (classroom.owner_id === req.user.id) {
        req.classroomRole = "owner";
        if (allowedRoles.includes("owner")) {
          next();
          return;
        }
      }

      // 3. Query classroom membership for scoped role
      const [membership] = await db
        .select()
        .from(classroomMembersTable)
        .where(
          and(
            eq(classroomMembersTable.classroom_id, classroomId),
            eq(classroomMembersTable.user_id, req.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        res.status(403).json({ error: "Forbidden: Not enrolled in this classroom" });
        return;
      }

      const memberRole = membership.role as "owner" | "ta" | "student";
      req.classroomRole = memberRole;

      if (!allowedRoles.includes(memberRole)) {
        res.status(403).json({ error: `Forbidden: Requires one of roles: [${allowedRoles.join(", ")}]` });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: "Internal error checking permissions" });
    }
  };
};
