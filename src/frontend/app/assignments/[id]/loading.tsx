export default function AssignmentLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-4 w-32 bg-surfaceElevated rounded" />

      {/* Header card skeleton */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <div className="flex justify-between pb-4 border-b border-borderSubtle">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-surfaceElevated rounded" />
            <div className="h-6 w-60 bg-surfaceElevated rounded" />
          </div>
          <div className="h-6 w-32 bg-surfaceElevated rounded" />
        </div>
        <div className="h-4 w-full bg-surfaceElevated rounded" />
      </div>

      {/* Student status skeleton */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <div className="h-4 w-40 bg-surfaceElevated rounded" />
        <div className="h-12 bg-surfaceElevated rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-surface p-3 h-16" />
          ))}
        </div>
      </div>

      {/* Tests skeleton */}
      <div className="card-surface p-6 flex flex-col gap-3">
        <div className="h-4 w-36 bg-surfaceElevated rounded" />
        <div className="h-10 bg-surfaceElevated rounded" />
        <div className="h-10 bg-surfaceElevated rounded" />
      </div>
    </div>
  );
}
