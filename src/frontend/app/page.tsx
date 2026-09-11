"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "../lib/auth-client";
import { ArrowRight, GitBranch, Cpu, CheckCircle2 } from "lucide-react";
import { GithubIcon } from "../components/github-icon";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [inviteCode, setInviteCode] = useState("");

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    router.push(`/join/${inviteCode.trim()}`);
  };

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: "/classrooms",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-16">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-borderSubtle bg-surface text-xs font-mono text-textMuted mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span>v1.0 • GitHub Classroom Alternative</span>
      </div>

      {/* Main Hero Header */}
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-center max-w-3xl mb-4 leading-tight">
        Autonomous Code Evaluation & Course Git Workflows
      </h1>
      <p className="text-sm sm:text-base text-textMuted text-center max-w-xl mb-8 leading-relaxed">
        Distribute private repositories from starter templates, ingest student git commits via webhooks, and autograde code against test suites automatically.
      </p>

      {/* Action Area */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mb-12">
        {session?.user ? (
          <button
            onClick={() => router.push("/classrooms")}
            className="w-full sm:w-auto flex-1 bg-accent hover:bg-accent-hover text-base font-medium px-4 py-2.5 rounded font-mono text-xs flex items-center justify-center gap-2 transition"
          >
            <span>Go to Classrooms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full sm:w-auto flex-1 bg-textPrimary hover:bg-white text-base font-medium px-4 py-2.5 rounded font-mono text-xs flex items-center justify-center gap-2 transition"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>Continue with GitHub</span>
          </button>
        )}

        {/* Quick Join Code Input */}
        <form onSubmit={handleJoinByCode} className="w-full sm:w-auto flex items-center">
          <input
            type="text"
            placeholder="Invite code..."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="bg-surface border border-borderSubtle px-3 py-2 text-xs font-mono rounded-l outline-none focus:border-accent text-textPrimary placeholder:text-gray-600 w-32 sm:w-28"
          />
          <button
            type="submit"
            className="bg-surfaceElevated border border-l-0 border-borderSubtle hover:border-gray-600 px-3 py-2 text-xs font-mono text-textMuted hover:text-textPrimary rounded-r transition"
          >
            Join
          </button>
        </form>
      </div>

      {/* 3 Minimal Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        <div className="card-surface p-5 flex flex-col gap-2">
          <GitBranch className="w-4 h-4 text-accent mb-1" />
          <h2 className="text-xs font-mono font-semibold text-textPrimary uppercase tracking-wider">
            Template Provisioning
          </h2>
          <p className="text-xs text-textMuted leading-relaxed">
            Asynchronous background workers instantiate private student repos from instructor templates in seconds.
          </p>
        </div>

        <div className="card-surface p-5 flex flex-col gap-2">
          <Cpu className="w-4 h-4 text-accent mb-1" />
          <h2 className="text-xs font-mono font-semibold text-textPrimary uppercase tracking-wider">
            Webhook Evaluation
          </h2>
          <p className="text-xs text-textMuted leading-relaxed">
            Ingests student git push events, verifies HMAC signatures, and evaluates tests via GitHub Actions or sandbox runner.
          </p>
        </div>

        <div className="card-surface p-5 flex flex-col gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent mb-1" />
          <h2 className="text-xs font-mono font-semibold text-textPrimary uppercase tracking-wider">
            Grade Scorecards
          </h2>
          <p className="text-xs text-textMuted leading-relaxed">
            Comprehensive per-student test breakdown with stdout/stderr inspection and 1-click regrade dispatch.
          </p>
        </div>
      </div>
    </div>
  );
}
