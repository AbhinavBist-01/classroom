import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  assignmentsTable,
  assignmentTestsTable,
  classroomMembersTable,
  classroomsTable,
  submissionsTable,
  testResultsTable,
} from "../../db/schema.js";

const DEFAULT_GRADING_TOKEN = "classroom_grading_secret_token";

export interface TestResultInput {
  test_id: number;
  status: "passed" | "failed";
  stdout?: string;
  stderr?: string;
  score?: number;
}

export interface IngestGradesPayload {
  submission_id: number;
  commit_sha?: string;
  results: TestResultInput[];
}

export class GradesService {
  /**
   * Validates bearer grading token
   */
  static verifyGradingToken(authHeader: string | undefined): boolean {
    const expectedToken = process.env.CLASSROOM_GRADING_TOKEN || DEFAULT_GRADING_TOKEN;
    if (!authHeader) return false;

    const parts = authHeader.split(" ");
    const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : parts[0];
    return token === expectedToken;
  }

  /**
   * Retrieves test run results breakdown for a submission with RBAC checks
   */
  static async getGradesBySubmission(submissionId: number, requestingUserId: string) {
    // 1. Fetch submission and parent assignment
    const [submission] = await db
      .select({
        id: submissionsTable.id,
        assignment_id: submissionsTable.assignment_id,
        student_id: submissionsTable.student_id,
        github_repo: submissionsTable.github_repo,
        commit_sha: submissionsTable.commit_sha,
        status: submissionsTable.status,
        score: submissionsTable.score,
        submitted_at: submissionsTable.submitted_at,
      })
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!submission) {
      return { status: "not_found" as const, error: "Submission not found" };
    }

    // 2. RBAC check: Must be the student who submitted, or classroom owner/TA
    const isStudentOwner = submission.student_id === requestingUserId;
    let isAuthorized = isStudentOwner;

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
              eq(classroomMembersTable.classroom_id, assignment.classroom_id)
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

    // 3. Fetch test results joined with assignment test definitions
    const results = await db
      .select({
        id: testResultsTable.id,
        test_id: testResultsTable.test_id,
        status: testResultsTable.status,
        stdout: testResultsTable.stdout,
        stderr: testResultsTable.stderr,
        score: testResultsTable.score,
        command: assignmentTestsTable.command,
        max_points: assignmentTestsTable.points,
      })
      .from(testResultsTable)
      .innerJoin(assignmentTestsTable, eq(testResultsTable.test_id, assignmentTestsTable.id))
      .where(eq(testResultsTable.submission_id, submissionId));

    // Calculate max possible points for the assignment
    const allTests = await db
      .select({ points: assignmentTestsTable.points })
      .from(assignmentTestsTable)
      .where(eq(assignmentTestsTable.assignment_id, submission.assignment_id));

    const maxScore = allTests.reduce((acc, t) => acc + t.points, 0);

    return {
      status: "success" as const,
      grades: {
        submission_id: submission.id,
        status: submission.status,
        score: submission.score,
        max_score: maxScore,
        commit_sha: submission.commit_sha,
        github_repo: submission.github_repo,
        submitted_at: submission.submitted_at,
        tests: results,
      },
    };
  }

  /**
   * Ingests autograding results from GitHub Actions or sandbox runner
   */
  static async ingestGrades(payload: IngestGradesPayload) {
    const { submission_id, commit_sha, results } = payload;

    const [submission] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, submission_id))
      .limit(1);

    if (!submission) {
      return { status: "not_found" as const, error: `Submission #${submission_id} not found` };
    }

    // Replace previous test results for this submission to ensure idempotency
    await db.delete(testResultsTable).where(eq(testResultsTable.submission_id, submission_id));

    let totalScore = 0;

    if (results && results.length > 0) {
      for (const res of results) {
        const pointsEarned = res.score ?? (res.status === "passed" ? 10 : 0);
        totalScore += pointsEarned;

        await db.insert(testResultsTable).values({
          submission_id,
          test_id: res.test_id,
          status: res.status,
          stdout: res.stdout || "",
          stderr: res.stderr || "",
          score: pointsEarned,
        });
      }
    }

    // Update submission record with graded score and status
    const updateData: { score: number; status: "graded"; commit_sha?: string } = {
      score: totalScore,
      status: "graded",
    };

    if (commit_sha) {
      updateData.commit_sha = commit_sha;
    }

    await db
      .update(submissionsTable)
      .set(updateData)
      .where(eq(submissionsTable.id, submission_id));

    return {
      status: "success" as const,
      submission_id,
      score: totalScore,
      tests_graded: results?.length ?? 0,
    };
  }

  /**
   * Generates a GitHub Actions autograding workflow YAML template (.github/workflows/grade.yml)
   */
  static generateWorkflowTemplate(apiUrl = "https://api.classroom.app"): string {
    return `name: Classroom Autograding
on: [push]

jobs:
  grade:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Build Environment
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Test Suite
        id: run_tests
        run: |
          mkdir -p .classroom
          # Run tests and output formatted JSON results
          npm test -- --json --outputFile=.classroom/results.json || true

      - name: Ingest Test Results
        if: always()
        run: |
          curl -X POST "${apiUrl}/api/grades/webhook" \\
            -H "Content-Type: application/json" \\
            -H "Authorization: Bearer \${{ secrets.CLASSROOM_GRADING_TOKEN }}" \\
            -d @.classroom/results.json
`;
  }
}
