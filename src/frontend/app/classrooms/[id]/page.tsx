"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { Copy, Check, Plus, BookOpen, Users, Calendar, ArrowRight } from "lucide-react";

interface AssignmentItem {
  id: number;
  title: string;
  description: string;
  deadline: string;
  template_repo: string;
  max_score: number;
  visibility: string;
}

interface ClassroomDetail {
  id: number;
  name: string;
  github_org: string;
  invite_code: string;
  owner_id: string;
  role: string;
  assignments: AssignmentItem[];
}

interface StudentMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classroomId = resolvedParams.id;

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [students, setStudents] = useState<StudentMember[]>([]);
  const [activeTab, setActiveTab] = useState<"assignments" | "roster">("assignments");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // New assignment modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [templateRepo, setTemplateRepo] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [isCreating, setIsCreating] = useState(false);

  const fetchClassroom = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<ClassroomDetail>(`/classrooms/${classroomId}`);
      setClassroom(data);

      // Also fetch roster
      try {
        const studentData = await apiFetch<StudentMember[]>(`/classrooms/${classroomId}/students`);
        setStudents(studentData);
      } catch {
        // Students fetch might fail if user is not authorized
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroom();
  }, [classroomId]);

  const copyInvite = () => {
    if (!classroom) return;
    const url = `${window.location.origin}/join/${classroom.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !templateRepo || !deadline) return;

    try {
      setIsCreating(true);
      await apiFetch(`/classrooms/${classroomId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          deadline,
          template_repo: templateRepo,
          max_score: parseInt(maxScore, 10) || 100,
          visibility: "public",
          tests: [
            {
              command: "npm test",
              expected_output: "All tests passing",
              points: parseInt(maxScore, 10) || 100,
              timeout: 10,
            },
          ],
        }),
      });

      setTitle("");
      setDescription("");
      setDeadline("");
      setTemplateRepo("");
      setIsModalOpen(false);
      await fetchClassroom();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-xs font-mono text-textMuted animate-pulse">Loading classroom...</div>;
  }

  if (!classroom) {
    return <div className="card-surface p-8 text-center text-xs font-mono text-rose-400">Classroom not found</div>;
  }

  const isInstructor = classroom.role === "owner" || classroom.role === "ta";

  return (
    <div className="flex flex-col gap-6">
      {/* Classroom Header */}
      <div className="card-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-borderSubtle bg-surfaceElevated text-textMuted uppercase tracking-wider">
              {classroom.role}
            </span>
            <span className="text-xs font-mono text-textMuted">Org: {classroom.github_org}</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-textPrimary tracking-tight">{classroom.name}</h1>
        </div>

        {/* Invite link button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={copyInvite}
            className="text-xs font-mono border border-borderSubtle bg-surfaceElevated hover:border-gray-500 text-textPrimary px-3 py-1.5 rounded flex items-center gap-1.5 transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? "Link Copied!" : `Invite: ${classroom.invite_code}`}</span>
          </button>

          {isInstructor && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-mono bg-accent hover:bg-accent-hover text-base font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-borderSubtle text-xs font-mono">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "assignments"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted hover:text-textPrimary"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Assignments ({classroom.assignments?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "roster"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted hover:text-textPrimary"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Roster ({students.length})</span>
        </button>
      </div>

      {/* Tab: Assignments */}
      {activeTab === "assignments" && (
        <div className="flex flex-col gap-3">
          {classroom.assignments?.length === 0 ? (
            <div className="card-surface p-12 text-center text-xs font-mono text-textMuted">
              No assignments declared yet.
            </div>
          ) : (
            classroom.assignments.map((a) => (
              <Link
                key={a.id}
                href={`/assignments/${a.id}`}
                className="card-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-gray-600 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold font-mono text-textPrimary group-hover:text-accent transition">
                      {a.title}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-borderSubtle text-textMuted">
                      {a.max_score} pts
                    </span>
                  </div>
                  <p className="text-xs text-textMuted line-clamp-1 max-w-xl">{a.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-textMuted shrink-0">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {a.deadline}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-textMuted group-hover:text-accent group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Tab: Roster */}
      {activeTab === "roster" && (
        <div className="card-surface divide-y divide-borderSubtle">
          {students.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-textMuted">No students enrolled yet.</div>
          ) : (
            students.map((s) => (
              <div key={s.id} className="p-3.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-textPrimary font-medium">{s.name || "Anonymous Student"}</span>
                  <span className="text-textMuted ml-2 text-[11px]">{s.email}</span>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-borderSubtle bg-surfaceElevated text-textMuted">
                  {s.role}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: New Assignment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card-surface max-w-md w-full p-6 flex flex-col gap-4 border border-gray-700">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-textPrimary">
              Declare New Assignment
            </h2>

            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-mono text-textMuted block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Binary Search Tree"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-textMuted block mb-1">Description</label>
                <textarea
                  placeholder="Brief assignment guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary h-20 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-textMuted block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-textMuted block mb-1">Max Score</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-textMuted block mb-1">
                  Starter Template Repo (owner/repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. teacher-org/bst-starter"
                  value={templateRepo}
                  onChange={(e) => setTemplateRepo(e.target.value)}
                  className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-borderSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono text-textMuted hover:text-textPrimary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-base font-mono text-xs font-medium px-4 py-1.5 rounded transition"
                >
                  {isCreating ? "Declaring..." : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
