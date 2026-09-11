"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { StatusBadge } from "../../../components/status-badge";
import {
  Calendar,
  ExternalLink,
  RotateCw,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Users,
} from "lucide-react";

interface TestCase {
  id: number;
  command: string;
  points: number;
  timeout: number;
  expected_output?: string;
}

interface AssignmentData {
  id: number;
  classroom_id: number;
  title: string;
  description: string;
  deadline: string;
  template_repo: string;
  max_score: number;
  tests: TestCase[];
}

interface SubmissionRecord {
  id: number;
  github_repo: string;
  commit_sha: string;
  status: string;
  score: number;
  submitted_at: string;
}

interface GradeDetail {
  submission_id: number;
  status: string;
  score: number;
  max_score: number;
  commit_sha: string;
  tests: Array<{
    id: number;
    test_id: number;
    status: "passed" | "failed";
    stdout: string;
    stderr: string;
    score: number;
    command: string;
    max_points: number;
  }>;
}

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [grade, setGrade] = useState<GradeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);

  const fetchAssignmentData = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<AssignmentData>(`/assignments/${assignmentId}`);
      setAssignment(data);

      // Attempt to check if an active submission exists
      try {
        const subData = await apiFetch<{ status: string; submission?: SubmissionRecord }>(
          `/assignments/${assignmentId}/accept`,
          { method: "POST" }
        );
        if (subData?.submission) {
          setSubmission(subData.submission);
          // If graded or ready, fetch detailed grades
          fetchGrades(subData.submission.id);
        }
      } catch {
        // If not already accepted or needs student action
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGrades = async (submissionId: number) => {
    try {
      const gradeData = await apiFetch<GradeDetail>(`/grades/${submissionId}`);
      setGrade(gradeData);
    } catch {
      // Grades might not be ready yet
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId]);

  const handleAcceptAssignment = async () => {
    try {
      setIsAccepting(true);
      const res = await apiFetch<{ submission: SubmissionRecord }>(`/assignments/${assignmentId}/accept`, {
        method: "POST",
      });
      if (res?.submission) {
        setSubmission(res.submission);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRegrade = async () => {
    if (!submission) return;
    try {
      setIsRegrading(true);
      await apiFetch(`/submissions/${submission.id}/regrade`, { method: "POST" });
      setSubmission({ ...submission, status: "pending", score: 0 });
      setTimeout(() => {
        if (submission?.id) fetchGrades(submission.id);
      }, 2000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsRegrading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-xs font-mono text-textMuted animate-pulse">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="card-surface p-8 text-center text-xs font-mono text-rose-400">Assignment not found</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/classrooms/${assignment.classroom_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-textMuted hover:text-textPrimary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classroom</span>
        </Link>

        {/* Link to Teacher Overview */}
        <Link
          href={`/assignments/${assignment.id}/grading`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-textMuted hover:text-accent transition border border-borderSubtle px-2.5 py-1 rounded"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Teacher Roster View</span>
        </Link>
      </div>

      {/* Assignment Header */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-borderSubtle">
          <div>
            <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider">Assignment Workspace</span>
            <h1 className="text-xl font-bold font-mono text-textPrimary tracking-tight">{assignment.title}</h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-textMuted self-start sm:self-auto">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due: {assignment.deadline}</span>
            </span>
            <span className="px-2 py-0.5 rounded border border-borderSubtle bg-surfaceElevated text-textPrimary">
              Max: {assignment.max_score} pts
            </span>
          </div>
        </div>

        <p className="text-xs text-textMuted leading-relaxed">{assignment.description}</p>
      </div>

      {/* Student Action / Repository Section */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-textPrimary">
          Student Repository & Status
        </h2>

        {!submission ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <p className="text-xs text-textMuted max-w-md">
              Accept this assignment to generate your private GitHub repository pre-configured with starter code and test runners.
            </p>
            <button
              onClick={handleAcceptAssignment}
              disabled={isAccepting}
              className="bg-accent hover:bg-accent-hover text-base font-mono text-xs font-medium px-5 py-2.5 rounded transition"
            >
              {isAccepting ? "Generating Repository..." : "Accept Assignment"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded bg-surfaceElevated border border-borderSubtle text-xs font-mono">
              <div className="flex items-center gap-3">
                <StatusBadge status={submission.status} />
                <span className="text-textPrimary truncate">{submission.github_repo}</span>
              </div>

              <div className="flex items-center gap-3">
                {submission.status === "ready" || submission.status === "graded" ? (
                  <a
                    href={`https://github.com/${submission.github_repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-accent hover:underline"
                  >
                    <span>Open in GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-textMuted text-[11px] animate-pulse">Provisioning repository...</span>
                )}

                <button
                  onClick={handleRegrade}
                  disabled={isRegrading}
                  className="hover:text-textPrimary text-textMuted transition flex items-center gap-1"
                  title="Trigger manual regrade"
                >
                  <RotateCw className={`w-3 h-3 ${isRegrading ? "animate-spin text-accent" : ""}`} />
                  <span>Regrade</span>
                </button>
              </div>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="card-surface p-3 flex flex-col">
                <span className="text-[10px] text-textMuted uppercase">Current Score</span>
                <span className="text-lg font-bold text-accent">
                  {submission.score} / {assignment.max_score}
                </span>
              </div>
              <div className="card-surface p-3 flex flex-col">
                <span className="text-[10px] text-textMuted uppercase">Status</span>
                <span className="text-sm font-semibold text-textPrimary capitalize">{submission.status}</span>
              </div>
              <div className="card-surface p-3 flex flex-col col-span-2">
                <span className="text-[10px] text-textMuted uppercase">Latest Commit SHA</span>
                <span className="text-xs font-mono text-textPrimary truncate">
                  {submission.commit_sha || "Awaiting initial push"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Suites / Test Results Breakdown */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-textPrimary">
          Test Suite Breakdown
        </h2>

        {grade?.tests && grade.tests.length > 0 ? (
          <div className="divide-y divide-borderSubtle">
            {grade.tests.map((t) => (
              <div key={t.id} className="py-3 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.status === "passed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="text-textPrimary font-medium">{t.command}</span>
                  </div>
                  <span className="text-textMuted text-[11px]">
                    {t.score} / {t.max_points} pts
                  </span>
                </div>

                {t.stdout && (
                  <pre className="p-2.5 rounded bg-base border border-borderSubtle text-[11px] text-textMuted overflow-x-auto">
                    {t.stdout}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-borderSubtle">
            {assignment.tests.map((test, index) => (
              <div key={test.id || index} className="py-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-accent" />
                  <span className="text-textPrimary">{test.command}</span>
                </div>
                <div className="flex items-center gap-3 text-textMuted text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{test.timeout}s</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-borderSubtle bg-surfaceElevated text-textPrimary">
                    {test.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
