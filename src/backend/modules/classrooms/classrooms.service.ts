import crypto from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  classroomMembersTable,
  classroomsTable,
  user,
} from "../../db/schema.js";

/**
 * Generates a cryptographically random, uppercase 6-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous: I, O, 0, 1
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

export interface CreateClassroomInput {
  name: string;
  github_org: string;
  owner_id: string;
}

export class ClassroomService {
  /**
   * Creates a new classroom and enrolls the creator as the 'owner' in classroom_members
   */
  static async createClassroom(input: CreateClassroomInput) {
    let inviteCode = generateInviteCode();

    // Ensure uniqueness
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await db
        .select({ id: classroomsTable.id })
        .from(classroomsTable)
        .where(eq(classroomsTable.invite_code, inviteCode))
        .limit(1);

      if (existing.length === 0) break;
      inviteCode = generateInviteCode();
    }

    // Insert classroom & owner membership atomically in a transaction
    return await db.transaction(async (tx) => {
      const [classroom] = await tx
        .insert(classroomsTable)
        .values({
          name: input.name,
          github_org: input.github_org,
          owner_id: input.owner_id,
          invite_code: inviteCode,
        })
        .returning();

      if (!classroom) {
        throw new Error("Failed to insert classroom record");
      }

      await tx.insert(classroomMembersTable).values({
        classroom_id: classroom.id,
        user_id: input.owner_id,
        role: "owner",
      });

      return classroom;
    });
  }

  /**
   * Lists all classrooms where the user is an owner, TA, or student
   */
  static async listUserClassrooms(userId: string) {
    // Query classrooms where the user is either the direct owner or a member
    const results = await db
      .select({
        id: classroomsTable.id,
        name: classroomsTable.name,
        github_org: classroomsTable.github_org,
        owner_id: classroomsTable.owner_id,
        invite_code: classroomsTable.invite_code,
        member_role: classroomMembersTable.role,
      })
      .from(classroomsTable)
      .leftJoin(
        classroomMembersTable,
        and(
          eq(classroomMembersTable.classroom_id, classroomsTable.id),
          eq(classroomMembersTable.user_id, userId)
        )
      )
      .where(
        or(
          eq(classroomsTable.owner_id, userId),
          eq(classroomMembersTable.user_id, userId)
        )
      );

    // Normalize roles (if user is direct owner, ensure role is 'owner')
    return results.map((c) => ({
      id: c.id,
      name: c.name,
      github_org: c.github_org,
      owner_id: c.owner_id,
      invite_code: c.invite_code,
      role: c.owner_id === userId ? "owner" : (c.member_role ?? "student"),
    }));
  }

  /**
   * Retrieves single classroom details with member counts
   */
  static async getClassroomById(classroomId: number) {
    const [classroom] = await db
      .select()
      .from(classroomsTable)
      .where(eq(classroomsTable.id, classroomId))
      .limit(1);

    if (!classroom) return null;

    // Get member counts
    const [countResult] = await db
      .select({
        total_members: sql<number>`count(*)::int`,
      })
      .from(classroomMembersTable)
      .where(eq(classroomMembersTable.classroom_id, classroomId));

    return {
      ...classroom,
      total_members: countResult?.total_members ?? 0,
    };
  }

  /**
   * Retrieves classroom students / roster
   */
  static async getClassroomStudents(classroomId: number) {
    return await db
      .select({
        user_id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: classroomMembersTable.role,
      })
      .from(classroomMembersTable)
      .innerJoin(user, eq(classroomMembersTable.user_id, user.id))
      .where(
        and(
          eq(classroomMembersTable.classroom_id, classroomId),
          eq(classroomMembersTable.role, "student")
        )
      );
  }

  /**
   * Retrieves all classroom members (owners, TAs, students)
   */
  static async getClassroomMembers(classroomId: number) {
    return await db
      .select({
        user_id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: classroomMembersTable.role,
      })
      .from(classroomMembersTable)
      .innerJoin(user, eq(classroomMembersTable.user_id, user.id))
      .where(eq(classroomMembersTable.classroom_id, classroomId));
  }

  /**
   * Regenerates a classroom invite code
   */
  static async regenerateInviteCode(classroomId: number) {
    const newCode = generateInviteCode();
    const [updated] = await db
      .update(classroomsTable)
      .set({ invite_code: newCode })
      .where(eq(classroomsTable.id, classroomId))
      .returning();

    return updated;
  }
}
