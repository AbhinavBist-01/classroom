import {
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

// Re-export Better Auth schema as the single source of truth for auth
export * from "./auth-schema.js";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const classroomRoleEnum = pgEnum("classroom_role", [
  "owner",
  "ta",
  "student",
]);
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "provisioning",
  "ready",
  "graded",
  "failed",
]);
export const testResultStatusEnum = pgEnum("test_result_status", [
  "passed",
  "failed",
]);

// Classrooms
export const classroomsTable = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  github_org: varchar("github_org", { length: 255 }).notNull(),
  invite_code: varchar("invite_code", { length: 255 }).notNull().unique(),
});

// Classroom Members (Roster & Scoped Roles)
export const classroomMembersTable = pgTable(
  "classroom_members",
  {
    classroom_id: integer("classroom_id")
      .notNull()
      .references(() => classroomsTable.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: classroomRoleEnum("role").notNull().default("student"),
  },
  (table) => [
    primaryKey({ columns: [table.classroom_id, table.user_id] }),
  ],
);

// Assignments
export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classroom_id: integer("classroom_id")
    .notNull()
    .references(() => classroomsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  deadline: date("deadline").notNull(),
  template_repo: varchar("template_repo", { length: 255 }).notNull(),
  max_score: integer("max_score").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("private"),
});

// Assignment Tests
export const assignmentTestsTable = pgTable("assignment_tests", {
  id: serial("id").primaryKey(),
  assignment_id: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  command: varchar("command", { length: 255 }).notNull(),
  expected_output: text("expected_output").notNull(),
  points: integer("points").notNull(),
  timeout: integer("timeout").notNull(),
});

// Submissions
export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignment_id: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  student_id: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  github_repo: varchar("github_repo", { length: 255 }).notNull(),
  commit_sha: varchar("commit_sha", { length: 255 }).notNull(),
  status: submissionStatusEnum("status").notNull().default("pending"),
  score: integer("score").notNull().default(0),
  submitted_at: timestamp("submitted_at").notNull().defaultNow(),
});

// Test Results
export const testResultsTable = pgTable("test_results", {
  id: serial("id").primaryKey(),
  submission_id: integer("submission_id")
    .notNull()
    .references(() => submissionsTable.id, { onDelete: "cascade" }),
  test_id: integer("test_id")
    .notNull()
    .references(() => assignmentTestsTable.id, { onDelete: "cascade" }),
  status: testResultStatusEnum("status").notNull(),
  stdout: text("stdout").notNull(),
  stderr: text("stderr").notNull(),
  score: integer("score").notNull(),
});
