"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../lib/api";
import { StatusBadge } from "../../../../components/status-badge";
import { ArrowLeft, RotateCw, ExternalLink, Users, Award, CheckCircle2, MessageSquare } from "lucide-react";

interface SubmissionsResponse {
  assignment: {
    id: number;
    title: string;
    max_score: number;
  };
  summary: {
    total: number;
    graded: number;
    avg_score: number;
    max_score: number;
  };
  submissions: Array<{
    id: number;
    student_id: string;
    student_name: string | null;
    student_email: string;
    github_repo: string;
    commit_sha: string;
    status: string;
    score: number;
    submitted_at: string;
  }>;
}

export default function TeacherGradingDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;

  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [regradingId, setRegradingId] = useState<number | null>(null);

  // Feedback modal state
  const [activeFeedbackSub, setActiveFeedbackSub] = useState<SubmissionsResponse["submissions"][0] | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch<SubmissionsResponse>(`/assignments/${assignmentId}/submissions`);
      setData(res);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const handleRegrade = async (submissionId: number) => {
    try {
      setRegradingId(submissionId);
      await apiFetch(`/submissions/${submissionId}/regrade`, { method: "POST" });
      await fetchSubmissions();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRegradingId(null);
    }
  };

  const handlePostFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackSub || !feedbackContent.trim()) return;

    try {
      setIsSubmittingFeedback(true);
      await apiFetch(`/submissions/${activeFeedbackSub.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ content: feedbackContent.trim() }),
      });
      setFeedbackContent("");
      setActiveFeedbackSub(null);
      alert("Feedback successfully recorded and synced to GitHub!");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-xs font-mono text-textMuted animate-pulse">Loading roster overview...</div>;
  }

  if (!data) {
    return <div className="card-surface p-8 text-center text-xs font-mono text-rose-400">Failed to load submissions</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <Link
          href={`/assignments/${assignmentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-textMuted hover:text-textPrimary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Assignment</span>
        </Link>
      </div>

      {/* Header */}
      <div className="card-surface p-6 flex flex-col gap-1">
        <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider">Teacher Gradebook</span>
        <h1 className="text-xl font-bold font-mono text-textPrimary tracking-tight">{data.assignment.title}</h1>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-surface p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-surfaceElevated border border-borderSubtle flex items-center justify-center text-textMuted">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-textMuted uppercase block">Total Accepted</span>
            <span className="text-lg font-bold font-mono text-textPrimary">{data.summary.total}</span>
          </div>
        </div>

        <div className="card-surface p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-surfaceElevated border border-borderSubtle flex items-center justify-center text-accent">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-textMuted uppercase block">Graded Submissions</span>
            <span className="text-lg font-bold font-mono text-textPrimary">
              {data.summary.graded} / {data.summary.total}
            </span>
          </div>
        </div>

        <div className="card-surface p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-surfaceElevated border border-borderSubtle flex items-center justify-center text-accent">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-textMuted uppercase block">Class Average</span>
            <span className="text-lg font-bold font-mono text-accent">
              {data.summary.avg_score} / {data.summary.max_score} pts
            </span>
          </div>
        </div>
      </div>

      {/* Submissions Roster Table */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-borderSubtle flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-textPrimary">Student Submissions ({data.submissions.length})</span>
          <button
            onClick={fetchSubmissions}
            className="text-textMuted hover:text-textPrimary flex items-center gap-1 transition text-[11px]"
          >
            <RotateCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {data.submissions.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-textMuted">
            No students have accepted or submitted this assignment yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-borderSubtle bg-surfaceElevated/50 text-[11px] text-textMuted uppercase">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Latest Commit</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {data.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-surfaceElevated/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-textPrimary">{sub.student_name || "Anonymous"}</div>
                      <div className="text-[11px] text-textMuted truncate max-w-xs">{sub.student_email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-3.5 text-textMuted font-mono text-[11px]">
                      {sub.commit_sha ? (
                        <span className="px-1.5 py-0.5 rounded bg-base border border-borderSubtle">
                          {sub.commit_sha.slice(0, 7)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      <span className={sub.score > 0 ? "text-accent" : "text-textMuted"}>
                        {sub.score}
                      </span>
                      <span className="text-textMuted text-[11px]"> / {data.summary.max_score}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {sub.github_repo && (
                          <a
                            href={`https://github.com/${sub.github_repo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:text-accent transition text-textMuted"
                            title="Open repository in GitHub"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setActiveFeedbackSub(sub)}
                          className="hover:text-accent text-textMuted transition p-1"
                          title="Leave review comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRegrade(sub.id)}
                          disabled={regradingId === sub.id}
                          className="hover:text-textPrimary text-textMuted transition p-1"
                          title="Trigger regrade"
                        >
                          <RotateCw
                            className={`w-3.5 h-3.5 ${regradingId === sub.id ? "animate-spin text-accent" : ""}`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Leave Feedback */}
      {activeFeedbackSub && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card-surface max-w-lg w-full p-6 flex flex-col gap-4 border border-gray-700">
            <div>
              <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider">Instructor Review</span>
              <h2 className="text-sm font-mono font-bold text-textPrimary">
                Feedback for {activeFeedbackSub.student_name || "Student"}
              </h2>
              <p className="text-xs text-textMuted">
                Review comments will be stored and automatically posted to the student's GitHub commit if available.
              </p>
            </div>

            <form onSubmit={handlePostFeedback} className="flex flex-col gap-3">
              <textarea
                placeholder="Write code annotations, review notes, or grading feedback..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary h-32 resize-none"
                required
              />

              <div className="flex items-center justify-between pt-3 border-t border-borderSubtle">
                <span className="text-[11px] font-mono text-textMuted truncate max-w-[200px]">
                  Commit: {activeFeedbackSub.commit_sha ? activeFeedbackSub.commit_sha.slice(0, 7) : "None"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFeedbackSub(null)}
                    className="px-3 py-1.5 text-xs font-mono text-textMuted hover:text-textPrimary transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-base font-mono text-xs font-medium px-4 py-1.5 rounded transition"
                  >
                    {isSubmittingFeedback ? "Posting..." : "Post Feedback"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
