import { and, eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  assignmentsTable,
  classroomMembersTable,
  classroomsTable,
  submissionFeedbackTable,
  submissionsTable,
  user,
} from "../../db/schema.js";
import { getOrgOctokit, isGithubAppConfigured } from "../github/github-app.js";

export class FeedbackService {
  /**
   * Instructor leaves feedback on a student submission, optionally syncing comment to GitHub commit
   */
  static async createFeedback(submissionId: number, authorId: string, content: string) {
    if (!content || !content.trim()) {
      return { status: "bad_request" as const, error: "Feedback content cannot be empty" };
    }

    // 1. Fetch submission and parent classroom
    const [submission] = await db
      .select({
        id: submissionsTable.id,
        assignment_id: submissionsTable.assignment_id,
        student_id: submissionsTable.student_id,
        github_repo: submissionsTable.github_repo,
        commit_sha: submissionsTable.commit_sha,
      })
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!submission) {
      return { status: "not_found" as const, error: "Submission not found" };
    }

    // 2. Authorization check: Author must be classroom owner or TA
    const [assignment] = await db
      .select({ classroom_id: assignmentsTable.classroom_id })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, submission.assignment_id))
      .limit(1);

    if (!assignment) {
      return { status: "not_found" as const, error: "Assignment not found" };
    }

    const [classroom] = await db
      .select({ owner_id: classroomsTable.owner_id })
      .from(classroomsTable)
      .where(eq(classroomsTable.id, assignment.classroom_id))
      .limit(1);

    const isOwner = classroom?.owner_id === authorId;
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const [membership] = await db
        .select({ role: classroomMembersTable.role })
        .from(classroomMembersTable)
        .where(
          and(
            eq(classroomMembersTable.classroom_id, assignment.classroom_id),
            eq(classroomMembersTable.user_id, authorId)
          )
        )
        .limit(1);

      if (membership && (membership.role === "owner" || membership.role === "ta")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { status: "forbidden" as const, error: "Only classroom instructors/TAs can post feedback" };
    }

    // 3. Optionally sync comment to GitHub commit via GitHub App API
    let githubCommentId: string | null = null;
    if (isGithubAppConfigured && submission.github_repo.includes("/") && submission.commit_sha) {
      try {
        const [owner, repo] = submission.github_repo.split("/");
        if (owner && repo) {
          const octokit = await getOrgOctokit(owner);
          const { data: ghComment } = await octokit.rest.repos.createCommitComment({
            owner,
            repo,
            commit_sha: submission.commit_sha,
            body: `### 🎓 Classroom Feedback\n\n${content.trim()}\n\n*Posted by Instructor via Classroom Judge*`,
          });
          githubCommentId = String(ghComment.id);
          console.log(`[FeedbackService] Synced comment #${githubCommentId} to GitHub commit ${submission.commit_sha}`);
        }
      } catch (ghErr) {
        console.warn("[FeedbackService] GitHub commit comment sync failed (falling back to DB):", (ghErr as Error).message);
      }
    }

    // 4. Save feedback in database
    const [feedback] = await db
      .insert(submissionFeedbackTable)
      .values({
        submission_id: submissionId,
        author_id: authorId,
        content: content.trim(),
        github_comment_id: githubCommentId,
      })
      .returning();

    return {
      status: "success" as const,
      feedback,
    };
  }

  /**
   * Retrieves all feedback notes for a submission with student/instructor RBAC
   */
  static async getFeedback(submissionId: number, requestingUserId: string) {
    // 1. Fetch submission
    const [submission] = await db
      .select({
        id: submissionsTable.id,
        assignment_id: submissionsTable.assignment_id,
        student_id: submissionsTable.student_id,
      })
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!submission) {
      return { status: "not_found" as const, error: "Submission not found" };
    }

    // 2. Authorization check: Submitting student or classroom instructor
    const isStudent = submission.student_id === requestingUserId;
    let isAuthorized = isStudent;

    if (!isAuthorized) {
      const [assignment] = await db
        .select({ classroom_id: assignmentsTable.classroom_id })
        .from(assignmentsTable)
        .where(eq(assignmentsTable.id, submission.assignment_id))
        .limit(1);

      if (assignment) {
        const [classroom] = await db
          .select({ owner_id: classroomsTable.owner_id })
          .from(classroomsTable)
          .where(eq(classroomsTable.id, assignment.classroom_id))
          .limit(1);

        if (classroom?.owner_id === requestingUserId) {
          isAuthorized = true;
        } else {
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
      }
    }

    if (!isAuthorized) {
      return { status: "forbidden" as const, error: "Access denied" };
    }

    // 3. Fetch all feedback items joined with author user record
    const items = await db
      .select({
        id: submissionFeedbackTable.id,
        submission_id: submissionFeedbackTable.submission_id,
        author_id: submissionFeedbackTable.author_id,
        author_name: user.name,
        author_email: user.email,
        content: submissionFeedbackTable.content,
        github_comment_id: submissionFeedbackTable.github_comment_id,
        created_at: submissionFeedbackTable.created_at,
      })
      .from(submissionFeedbackTable)
      .innerJoin(user, eq(submissionFeedbackTable.author_id, user.id))
      .where(eq(submissionFeedbackTable.submission_id, submissionId))
      .orderBy(desc(submissionFeedbackTable.created_at));

    return {
      status: "success" as const,
      feedback: items,
    };
  }
}
