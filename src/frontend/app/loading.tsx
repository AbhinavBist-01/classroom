export default function GlobalLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse py-6">
      <div className="h-8 bg-surfaceElevated rounded w-1/3 border border-borderSubtle" />
      <div className="h-4 bg-surfaceElevated rounded w-1/2 border border-borderSubtle" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="card-surface p-6 h-32" />
        <div className="card-surface p-6 h-32" />
        <div className="card-surface p-6 h-32" />
      </div>
    </div>
  );
}
