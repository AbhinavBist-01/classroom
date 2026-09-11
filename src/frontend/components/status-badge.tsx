export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case "ready":
    case "graded":
    case "passed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-emerald-900/60 bg-emerald-950/30 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {status}
        </span>
      );
    case "provisioning":
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-yellow-900/60 bg-yellow-950/30 text-yellow-400">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          {status}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-rose-900/60 bg-rose-950/30 text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-borderSubtle bg-surface text-textMuted">
          {status}
        </span>
      );
  }
}
