import {
  integer,
  pgEnum,
  pgTable,
  serial,
  varchar,
  date,
} from "drizzle-orm/pg-core";
import { Socket } from "node:dgram";
import { stdout } from "node:process";

const roleEnum = pgEnum("role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey().notNull().unique(),
  github_id: integer("github_id").notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("user"),
});

export const classroomsTable = pgTable("classrooms", {
  id: serial("id").primaryKey().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  owner_id: integer("owner_id")
    .notNull()
    .references(() => usersTable.id),
  github_org: varchar("github_org", { length: 255 }).notNull(),
  invite_code: varchar("invite_code", { length: 255 }).notNull().unique(),
});

export const classroomMembersTable = pgTable("classroom_members", {
  classroom_id: integer("classroom_id")
    .notNull()
    .references(() => classroomsTable.id),
  user_id: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  role: roleEnum("role").notNull().default("user"),
});

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey().notNull().unique(),
  classroom_id: integer("classroom_id")
    .notNull()
    .references(() => classroomsTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  deadline: date("deadline").notNull(),
  template_repo: varchar("template_repo", { length: 255 }).notNull(),
  max_score: integer("max_score").notNull(),
  visibilty: pgEnum("visibility", ["public", "private"])("visibility")
    .notNull()
    .default("private"),
});

export const assignmentTestsTable = pgTable("assignment_tests", {
  id: serial("id").primaryKey().notNull().unique(),
  assignment_id: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id),
  command: varchar("command", { length: 255 }).notNull(),
  expected_output: varchar("expected_output", { length: 255 }).notNull(),
  points: integer("points").notNull(),
  timeout: integer("timeout").notNull(),
});

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey().notNull().unique(),
  assignment_id: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id),
  student_id: integer("student_id")
    .notNull()
    .references(() => usersTable.id),
  github_repo: varchar("github_repo", { length: 255 }).notNull(),
  commit_sha: varchar("commit_sha", { length: 255 }).notNull(),
  status: pgEnum("status", ["pending", "graded"])("status")
    .notNull()
    .default("pending"),
  score: integer("score").notNull().default(0),
  submitted_at: date("submitted_at").notNull().defaultNow(),
});

export const testResultsTable = pgTable("test_results", {
  submission_id: integer("submission_id")
    .notNull()
    .references(() => submissionsTable.id),
  test_id: integer("test_id")
    .notNull()
    .references(() => assignmentTestsTable.id),
  status: pgEnum("status", ["passed", "failed"])("status").notNull(),
  stdout: varchar("stdout", { length: 255 }).notNull(),
  stderr: varchar("stderr", { length: 255 }).notNull(),
  score: integer("score").notNull(),
});
