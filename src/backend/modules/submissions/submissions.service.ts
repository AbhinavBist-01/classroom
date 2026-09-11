import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  account,
  assignmentsTable,
  classroomMembersTable,
  classroomsTable,
  submissionsTable,
  user,
} from "../../db/schema.js";
import { gradingQueue, repoProvisionQueue } from "../queue/queue.js";

/**
 * Sanitizes a string for use in GitHub repository names
 */
function sanitizeRepoNamePart(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export class SubmissionService {
  /**
   * Student accepts an assignment: validates enrollment, creates submission, and queues repo generation
   */
  static async acceptAssignment(assignmentId: number, studentId: string) {
    // 1. Fetch assignment and its parent classroom
    const [assignment] = await db
      .select({
        id: assignmentsTable.id,
        title: assignmentsTable.title,
        template_repo: assignmentsTable.template_repo,
        classroom_id: assignmentsTable.classroom_id,
        github_org: classroomsTable.github_org,
        owner_id: classroomsTable.owner_id,
      })
      .from(assignmentsTable)
      .innerJoin(classroomsTable, eq(assignmentsTable.classroom_id, classroomsTable.id))
      .where(eq(assignmentsTable.id, assignmentId))
      .limit(1);

    if (!assignment) {
      return { status: "not_found" as const, error: "Assignment not found" };
    }

    // 2. Check enrollment in this classroom
    const isOwner = assignment.owner_id === studentId;
    let isEnrolled = isOwner;

    if (!isEnrolled) {
      const [membership] = await db
        .select()
        .from(classroomMembersTable)
        .where(
          and(
            eq(classroomMembersTable.classroom_id, assignment.classroom_id),
            eq(classroomMembersTable.user_id, studentId)
          )
        )
        .limit(1);

      if (membership) isEnrolled = true;
    }

    if (!isEnrolled) {
      return { status: "forbidden" as const, error: "Not enrolled in this classroom" };
    }

    // 3. Check for existing submission
    const [existing] = await db
      .select()
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.assignment_id, assignmentId),
          eq(submissionsTable.student_id, studentId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        status: existing.status === "ready" ? ("already_ready" as const) : ("in_progress" as const),
        submission: existing,
      };
    }

    // 4. Resolve student's GitHub username from account / user record
    const [ghAccount] = await db
      .select({ account_id: account.accountId })
      .from(account)
      .where(and(eq(account.userId, studentId), eq(account.providerId, "github")))
      .limit(1);

    const [userRecord] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, studentId))
      .limit(1);

    const rawUsername = userRecord?.name || ghAccount?.account_id || "student";
    const studentUsername = sanitizeRepoNamePart(rawUsername);
    const repoTitlePart = sanitizeRepoNamePart(assignment.title);
    const repoName = `${repoTitlePart}-${studentUsername}`;

    // 5. Insert initial submission record with status 'provisioning'
    const [submission] = await db
      .insert(submissionsTable)
      .values({
        assignment_id: assignmentId,
        student_id: studentId,
        github_repo: `${assignment.github_org}/${repoName}`,
        commit_sha: "",
        status: "provisioning",
        score: 0,
      })
      .returning();

    if (!submission) {
      throw new Error("Failed to initialize submission record");
    }

    // 6. Push job to BullMQ queue for async worker processing
    try {
      await repoProvisionQueue.add("provision", {
        submission_id: submission.id,
        classroom_id: assignment.classroom_id,
        assignment_id: assignment.id,
        student_id: studentId,
        student_username: studentUsername,
        template_repo: assignment.template_repo,
        target_org: assignment.github_org,
        repo_name: repoName,
      });
    } catch (queueError) {
      console.warn(
        "Could not enqueue job to Redis/BullMQ (running in fallback mode):",
        (queueError as Error).message
      );
    }

    return {
      status: "provisioning" as const,
      submission,
    };
  }

  /**
   * Retrieves single submission details
   */
  static async getSubmission(submissionId: number, requestingUserId: string) {
    const [submission] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!submission) return null;

    // Check authorization (must be submitting student, or classroom owner/TA)
    if (submission.student_id === requestingUserId) {
      return submission;
    }

    const [assignment] = await db
      .select({ classroom_id: assignmentsTable.classroom_id })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, submission.assignment_id))
      .limit(1);

    if (!assignment) return null;

    const [classroom] = await db
      .select({ owner_id: classroomsTable.owner_id })
      .from(classroomsTable)
      .where(eq(classroomsTable.id, assignment.classroom_id))
      .limit(1);

    if (classroom?.owner_id === requestingUserId) {
      return submission;
    }

    const [membership] = await db
      .select({ role: classroomMembersTable.role })
      .from(classroomMembersTable)
      .where(
        and(
          eq(classroomMembersTable.classroom_id, assignment.classroom_id),
          eq(classroomMembersTable.user_id, requestingUserId)
        )
      )
      .limit(1);

    if (membership && (membership.role === "owner" || membership.role === "ta")) {
      return submission;
    }

    return null;
  }

  /**
   * Triggers manual re-evaluation of a submission
   */
  static async regradeSubmission(submissionId: number, requestingUserId: string) {
    const submission = await this.getSubmission(submissionId, requestingUserId);
    if (!submission) {
      return { status: "not_found" as const, error: "Submission not found or access denied" };
    }

    // Reset status to pending
    const [updated] = await db
      .update(submissionsTable)
      .set({
        status: "pending",
        score: 0,
      })
      .where(eq(submissionsTable.id, submissionId))
      .returning();

    // Enqueue grading job
    try {
      await gradingQueue.add("grade", {
        submission_id: submission.id,
        assignment_id: submission.assignment_id,
        student_id: submission.student_id,
        github_repo: submission.github_repo,
        commit_sha: submission.commit_sha || "",
      });
    } catch (queueErr) {
      console.warn(
        "[SubmissionService:regrade] Could not enqueue grading job (Redis offline?):",
        (queueErr as Error).message
      );
    }

    return {
      status: "success" as const,
      message: "Regrading has been queued",
      submission: updated,
    };
  }

  /**
   * Retrieves all submissions for an assignment with student details (Teacher Dashboard View)
   */
  static async getAssignmentSubmissions(assignmentId: number, requestingUserId: string) {
    // 1. Fetch assignment and check instructor authorization
    const [assignment] = await db
      .select({
        id: assignmentsTable.id,
        title: assignmentsTable.title,
        classroom_id: assignmentsTable.classroom_id,
        max_score: assignmentsTable.max_score,
        owner_id: classroomsTable.owner_id,
      })
      .from(assignmentsTable)
      .innerJoin(classroomsTable, eq(assignmentsTable.classroom_id, classroomsTable.id))
      .where(eq(assignmentsTable.id, assignmentId))
      .limit(1);

    if (!assignment) {
      return { status: "not_found" as const, error: "Assignment not found" };
    }

    const isOwner = assignment.owner_id === requestingUserId;
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const [membership] = await db
        .select({ role: classroomMembersTable.role })
        .from(classroomMembersTable)
        .where(
          and(
            eq(classroomMembersTable.classroom_id, assignment.classroom_id),
            eq(classroomMembersTable.user_id, requestingUserId)
          )
        )
        .limit(1);

      if (membership && (membership.role === "owner" || membership.role === "ta")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { status: "forbidden" as const, error: "Access denied. Instructor permissions required." };
    }

    // 2. Fetch all submissions joined with user info
    const submissions = await db
      .select({
        id: submissionsTable.id,
        student_id: submissionsTable.student_id,
        student_name: user.name,
        student_email: user.email,
        github_repo: submissionsTable.github_repo,
        commit_sha: submissionsTable.commit_sha,
        status: submissionsTable.status,
        score: submissionsTable.score,
        submitted_at: submissionsTable.submitted_at,
      })
      .from(submissionsTable)
      .innerJoin(user, eq(submissionsTable.student_id, user.id))
      .where(eq(submissionsTable.assignment_id, assignmentId));

    // 3. Compute metrics summary
    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === "graded").length;
    const totalScore = submissions.reduce((acc, s) => acc + s.score, 0);
    const avgScore = total > 0 ? Math.round((totalScore / total) * 10) / 10 : 0;

    return {
      status: "success" as const,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          max_score: assignment.max_score,
        },
        summary: {
          total,
          graded,
          avg_score: avgScore,
          max_score: assignment.max_score,
        },
        submissions,
      },
    };
  }
}
