"use client";

import Link from "next/link";
import { useSession, signOut, signIn } from "../lib/auth-client";
import { LogOut, Terminal, BookOpen } from "lucide-react";
import { GithubIcon } from "./github-icon";

export function Navbar() {
  const { data: session, isPending } = useSession();

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: "/classrooms",
    });
  };

  const handleSignOut = async () => {
    await signOut({});
    window.location.href = "/";
  };

  return (
    <header className="border-b border-borderSubtle bg-surface sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-mono font-semibold tracking-tight text-textPrimary hover:text-white transition">
          <Terminal className="w-4 h-4 text-accent" />
          <span>classroom<span className="text-accent">_</span></span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6 text-xs text-textMuted font-mono">
          <Link href="/classrooms" className="hover:text-textPrimary transition flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Classrooms</span>
          </Link>
        </nav>

        {/* User Auth */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="w-16 h-7 bg-surfaceElevated rounded animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-textMuted font-mono hidden sm:inline">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs font-mono text-textMuted hover:text-textPrimary flex items-center gap-1 border border-borderSubtle hover:border-gray-600 px-2.5 py-1 rounded transition"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-xs font-mono bg-textPrimary text-base hover:bg-white px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
