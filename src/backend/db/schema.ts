import {
  bigint,
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

export * from "./auth-schema.js";

export const roleEnum = pgEnum("role", ["user", "admin"]);
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

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  github_id: bigint("github_id", { mode: "number" }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("user"),
});

export const classroomsTable = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  owner_id: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  github_org: varchar("github_org", { length: 255 }).notNull(),
  invite_code: varchar("invite_code", { length: 255 }).notNull().unique(),
});

export const classroomMembersTable = pgTable(
  "classroom_members",
  {
    classroom_id: integer("classroom_id")
      .notNull()
      .references(() => classroomsTable.id, { onDelete: "cascade" }),
    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("user"),
  },
  (table) => [
    primaryKey({ columns: [table.classroom_id, table.user_id] }),
  ],
);

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

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignment_id: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  student_id: integer("student_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  github_repo: varchar("github_repo", { length: 255 }).notNull(),
  commit_sha: varchar("commit_sha", { length: 255 }).notNull(),
  status: submissionStatusEnum("status").notNull().default("pending"),
  score: integer("score").notNull().default(0),
  submitted_at: timestamp("submitted_at").notNull().defaultNow(),
});

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
