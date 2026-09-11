"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { useSession, signIn } from "../../../lib/auth-client";
import { School, ArrowRight } from "lucide-react";
import { GithubIcon } from "../../../components/github-icon";

interface ClassroomPreview {
  id: number;
  name: string;
  github_org: string;
  owner_name: string;
  students_count: number;
}

export default function JoinClassroomPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;
  const router = useRouter();

  const { data: session, isPending: isSessionLoading } = useSession();
  const [classroom, setClassroom] = useState<ClassroomPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch<ClassroomPreview>(`/classrooms/join/${code}`);
        setClassroom(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [code]);

  const handleEnroll = async () => {
    if (!session?.user) {
      await signIn.social({
        provider: "github",
        callbackURL: `/join/${code}`,
      });
      return;
    }

    try {
      setIsJoining(true);
      const res = await apiFetch<{ message: string; classroom_id: number }>(`/classrooms/join/${code}`, {
        method: "POST",
      });

      router.push(`/classrooms/${res.classroom_id}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-xs font-mono text-textMuted animate-pulse">Loading invitation...</div>;
  }

  if (error || !classroom) {
    return (
      <div className="card-surface max-w-md mx-auto p-8 text-center flex flex-col items-center gap-3">
        <School className="w-8 h-8 text-rose-400 mb-1" />
        <h2 className="text-sm font-mono font-bold text-rose-400">Invalid Invite Code</h2>
        <p className="text-xs text-textMuted">This classroom invite code does not exist or has expired.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="card-surface p-6 flex flex-col gap-5 border border-borderSubtle">
        <div className="flex items-center gap-3 pb-4 border-b border-borderSubtle">
          <div className="w-10 h-10 rounded bg-surfaceElevated border border-borderSubtle flex items-center justify-center">
            <School className="w-5 h-5 text-accent" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider">Classroom Invitation</span>
            <h1 className="text-base font-bold font-mono text-textPrimary tracking-tight">{classroom.name}</h1>
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-borderSubtle/50">
            <span className="text-textMuted">Instructor</span>
            <span className="text-textPrimary">{classroom.owner_name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-borderSubtle/50">
            <span className="text-textMuted">Organization</span>
            <span className="text-textPrimary">{classroom.github_org}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-textMuted">Enrolled Students</span>
            <span className="text-textPrimary">{classroom.students_count}</span>
          </div>
        </div>

        <div className="pt-2">
          {!session?.user ? (
            <button
              onClick={handleEnroll}
              className="w-full bg-textPrimary hover:bg-white text-base font-mono text-xs font-medium py-2.5 rounded flex items-center justify-center gap-2 transition"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Sign in with GitHub to Enroll</span>
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={isJoining}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-base font-mono text-xs font-medium py-2.5 rounded flex items-center justify-center gap-2 transition"
            >
              <span>{isJoining ? "Enrolling..." : "Enroll in Classroom"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
