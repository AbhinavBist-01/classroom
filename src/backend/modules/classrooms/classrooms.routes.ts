import { Router } from "express";
import { requireClassroomRole } from "../../middleware/rbac.js";
import { AssignmentController } from "../assignments/assignments.controller.js";
import { ClassroomController } from "./classrooms.controller.js";

export const classroomsRouter: Router = Router();

// Create classroom
classroomsRouter.post("/", ClassroomController.create);

// List user's classrooms
classroomsRouter.get("/", ClassroomController.list);

// Join classroom via invite code (Phase 5)
classroomsRouter.get("/join/:code", ClassroomController.previewJoin);
classroomsRouter.post("/join/:code", ClassroomController.join);

// Classroom details (owners, TAs, and students)
classroomsRouter.get(
  "/:id",
  requireClassroomRole(["owner", "ta", "student"]),
  ClassroomController.getById
);

// Classroom students roster (instructors & TAs only)
classroomsRouter.get(
  "/:id/students",
  requireClassroomRole(["owner", "ta"]),
  ClassroomController.getStudents
);

// Classroom all members roster (instructors & TAs only)
classroomsRouter.get(
  "/:id/members",
  requireClassroomRole(["owner", "ta"]),
  ClassroomController.getMembers
);

// Regenerate classroom invite link (owner only)
classroomsRouter.post(
  "/:id/regenerate-invite",
  requireClassroomRole(["owner"]),
  ClassroomController.regenerateInvite
);

// Classroom Assignments (Phase 6)
classroomsRouter.post(
  "/:id/assignments",
  requireClassroomRole(["owner", "ta"]),
  AssignmentController.create
);
classroomsRouter.get(
  "/:id/assignments",
  requireClassroomRole(["owner", "ta", "student"]),
  AssignmentController.listByClassroom
);
