"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useSession, signIn } from "../../lib/auth-client";
import { Plus, Copy, Check, ExternalLink, School, Users } from "lucide-react";
import { GithubIcon } from "../../components/github-icon";

interface ClassroomItem {
  id: number;
  name: string;
  github_org: string;
  invite_code: string;
  role: string;
}

export default function ClassroomsPage() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New classroom modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [githubOrg, setGithubOrg] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<ClassroomItem[]>("/classrooms");
      setClassrooms(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchClassrooms();
    }
  }, [session?.user]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !githubOrg.trim()) return;

    try {
      setIsCreating(true);
      await apiFetch("/classrooms", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          github_org: githubOrg.trim(),
        }),
      });

      setName("");
      setGithubOrg("");
      setIsModalOpen(false);
      await fetchClassrooms();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-xs font-mono text-textMuted">
        Checking authentication...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="card-surface max-w-md mx-auto p-8 text-center flex flex-col items-center gap-4">
        <School className="w-8 h-8 text-accent mb-2" />
        <h2 className="text-base font-mono font-semibold">Sign in Required</h2>
        <p className="text-xs text-textMuted">
          You must sign in with your GitHub account to access or create classrooms.
        </p>
        <button
          onClick={() => signIn.social({ provider: "github", callbackURL: "/classrooms" })}
          className="bg-textPrimary hover:bg-white text-base font-mono text-xs font-medium px-4 py-2 rounded flex items-center gap-2 transition"
        >
          <GithubIcon className="w-3.5 h-3.5" />
          <span>Sign in with GitHub</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Your Classrooms</h1>
          <p className="text-xs text-textMuted">
            Manage course organizations, assignments, and student rosters
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-base font-mono text-xs font-medium px-3.5 py-2 rounded transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Classroom list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-surface p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="card-surface p-6 text-center text-xs font-mono text-rose-400 border-rose-900/40">
          {error}
        </div>
      ) : classrooms.length === 0 ? (
        <div className="card-surface p-12 text-center flex flex-col items-center gap-3">
          <School className="w-8 h-8 text-gray-600 mb-1" />
          <h3 className="text-sm font-mono font-medium text-textPrimary">No Classrooms Found</h3>
          <p className="text-xs text-textMuted max-w-sm">
            You are not enrolled in any classrooms yet. Create a classroom as an instructor or join using an invite code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((c) => (
            <div key={c.id} className="card-surface p-5 flex flex-col justify-between gap-4 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-borderSubtle bg-surfaceElevated uppercase tracking-wider text-textMuted">
                    {c.role}
                  </span>
                  <span className="text-xs font-mono text-textMuted flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Org: {c.github_org}</span>
                  </span>
                </div>

                <Link
                  href={`/classrooms/${c.id}`}
                  className="text-base font-semibold text-textPrimary group-hover:text-accent transition flex items-center gap-1.5"
                >
                  <span>{c.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                </Link>
              </div>

              {/* Invite link snippet */}
              <div className="pt-3 border-t border-borderSubtle flex items-center justify-between text-xs font-mono text-textMuted">
                <span className="truncate mr-2">Code: {c.invite_code}</span>
                <button
                  onClick={() => copyInviteLink(c.invite_code)}
                  className="hover:text-textPrimary transition flex items-center gap-1 text-[11px]"
                  title="Copy join link"
                >
                  {copiedCode === c.invite_code ? (
                    <>
                      <Check className="w-3 h-3 text-accent" />
                      <span className="text-accent">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Classroom */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card-surface max-w-md w-full p-6 flex flex-col gap-4 border border-gray-700">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-textPrimary">
              Create New Classroom
            </h2>
            <p className="text-xs text-textMuted">
              Student repositories will be provisioned inside your designated GitHub organization.
            </p>

            <form onSubmit={handleCreateClassroom} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-mono text-textMuted block mb-1">
                  Classroom Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures 2027"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-base border border-borderSubtle px-3 py-2 text-xs font-mono rounded outline-none focus:border-accent text-textPrimary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-textMuted block mb-1">
                  GitHub Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. college-dsa-org"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
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
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
