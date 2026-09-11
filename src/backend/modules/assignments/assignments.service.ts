import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  assignmentTestsTable,
  assignmentsTable,
  classroomMembersTable,
  classroomsTable,
} from "../../db/schema.js";

export interface TestCaseInput {
  command: string;
  expected_output: string;
  points: number;
  timeout?: number;
}

export interface CreateAssignmentInput {
  classroom_id: number;
  title: string;
  description: string;
  deadline: string;
  template_repo: string;
  max_score?: number | undefined;
  visibility?: ("public" | "private") | undefined;
  tests?: TestCaseInput[] | undefined;
}

export interface UpdateAssignmentInput {
  title?: string | undefined;
  description?: string | undefined;
  deadline?: string | undefined;
  template_repo?: string | undefined;
  max_score?: number | undefined;
  visibility?: ("public" | "private") | undefined;
  tests?: TestCaseInput[] | undefined;
}

export class AssignmentService {
  /**
   * Creates an assignment and its test suite atomically
   */
  static async createAssignment(input: CreateAssignmentInput) {
    const tests = input.tests ?? [];

    // Calculate total points from test suite if max_score not provided
    const calculatedPoints = tests.reduce((acc, t) => acc + (t.points || 0), 0);
    const maxScore = input.max_score ?? (calculatedPoints > 0 ? calculatedPoints : 100);

    return await db.transaction(async (tx) => {
      const [assignment] = await tx
        .insert(assignmentsTable)
        .values({
          classroom_id: input.classroom_id,
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          template_repo: input.template_repo,
          max_score: maxScore,
          visibility: input.visibility ?? "private",
        })
        .returning();

      if (!assignment) {
        throw new Error("Failed to insert assignment record");
      }

      let createdTests: (typeof assignmentTestsTable.$inferSelect)[] = [];
      if (tests.length > 0) {
        createdTests = await tx
          .insert(assignmentTestsTable)
          .values(
            tests.map((t) => ({
              assignment_id: assignment.id,
              command: t.command,
              expected_output: t.expected_output,
              points: t.points,
              timeout: t.timeout ?? 10,
            }))
          )
          .returning();
      }

      return {
        ...assignment,
        tests: createdTests,
      };
    });
  }

  /**
   * Lists assignments belonging to a classroom
   */
  static async listByClassroom(
    classroomId: number,
    role: "owner" | "ta" | "student" = "student"
  ) {
    // If student, filter out private assignments (or show per instructor policy)
    let query = db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.classroom_id, classroomId));

    if (role === "student") {
      query = db
        .select()
        .from(assignmentsTable)
        .where(
          and(
            eq(assignmentsTable.classroom_id, classroomId),
            eq(assignmentsTable.visibility, "public")
          )
        );
    }

    const assignments = await query;
    return assignments;
  }

  /**
   * Retrieves single assignment with its test suites (sanitized for students)
   */
  static async getById(
    assignmentId: number,
    role: "owner" | "ta" | "student" = "student"
  ) {
    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .limit(1);

    if (!assignment) return null;

    const tests = await db
      .select()
      .from(assignmentTestsTable)
      .where(eq(assignmentTestsTable.assignment_id, assignmentId));

    // Security: Mask hidden expected_output for students to prevent solution extraction
    const sanitizedTests = tests.map((t) => {
      if (role === "student") {
        return {
          id: t.id,
          assignment_id: t.assignment_id,
          command: t.command,
          points: t.points,
          timeout: t.timeout,
          expected_output: "[HIDDEN TEST CASE]",
        };
      }
      return t;
    });

    return {
      ...assignment,
      tests: sanitizedTests,
    };
  }

  /**
   * Updates assignment metadata and optional test suite atomically
   */
  static async updateAssignment(
    assignmentId: number,
    updates: UpdateAssignmentInput
  ) {
    return await db.transaction(async (tx) => {
      const updateData: Partial<typeof assignmentsTable.$inferInsert> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.deadline !== undefined) updateData.deadline = updates.deadline;
      if (updates.template_repo !== undefined) updateData.template_repo = updates.template_repo;
      if (updates.max_score !== undefined) updateData.max_score = updates.max_score;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;

      let updatedAssignment = null;
      if (Object.keys(updateData).length > 0) {
        const [res] = await tx
          .update(assignmentsTable)
          .set(updateData)
          .where(eq(assignmentsTable.id, assignmentId))
          .returning();
        updatedAssignment = res;
      } else {
        const [res] = await tx
          .select()
          .from(assignmentsTable)
          .where(eq(assignmentsTable.id, assignmentId))
          .limit(1);
        updatedAssignment = res;
      }

      if (updates.tests !== undefined) {
        // Replace test suite
        await tx
          .delete(assignmentTestsTable)
          .where(eq(assignmentTestsTable.assignment_id, assignmentId));

        if (updates.tests.length > 0) {
          await tx.insert(assignmentTestsTable).values(
            updates.tests.map((t) => ({
              assignment_id: assignmentId,
              command: t.command,
              expected_output: t.expected_output,
              points: t.points,
              timeout: t.timeout ?? 10,
            }))
          );
        }
      }

      const currentTests = await tx
        .select()
        .from(assignmentTestsTable)
        .where(eq(assignmentTestsTable.assignment_id, assignmentId));

      return {
        ...updatedAssignment,
        tests: currentTests,
      };
    });
  }

  /**
   * Deletes an assignment
   */
  static async deleteAssignment(assignmentId: number) {
    const [deleted] = await db
      .delete(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .returning();

    return deleted ?? null;
  }

  /**
   * Helper: Resolves classroom ID and user role for a given assignment
   */
  static async resolveUserRoleForAssignment(assignmentId: number, userId: string) {
    const [assignment] = await db
      .select({ classroom_id: assignmentsTable.classroom_id })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .limit(1);

    if (!assignment) return null;

    const [classroom] = await db
      .select({ owner_id: classroomsTable.owner_id })
      .from(classroomsTable)
      .where(eq(classroomsTable.id, assignment.classroom_id))
      .limit(1);

    if (classroom?.owner_id === userId) {
      return { role: "owner" as const, classroom_id: assignment.classroom_id };
    }

    const [member] = await db
      .select({ role: classroomMembersTable.role })
      .from(classroomMembersTable)
      .where(
        and(
          eq(classroomMembersTable.classroom_id, assignment.classroom_id),
          eq(classroomMembersTable.user_id, userId)
        )
      )
      .limit(1);

    if (!member) return null;

    return {
      role: member.role as "owner" | "ta" | "student",
      classroom_id: assignment.classroom_id,
    };
  }
}
