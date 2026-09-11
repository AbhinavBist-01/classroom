export default function ClassroomsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-borderSubtle">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-surfaceElevated rounded" />
          <div className="h-3 w-64 bg-surfaceElevated rounded" />
        </div>
        <div className="h-8 w-32 bg-surfaceElevated rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card-surface p-5 h-36 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-surfaceElevated rounded" />
                <div className="h-3 w-20 bg-surfaceElevated rounded" />
              </div>
              <div className="h-5 w-3/4 bg-surfaceElevated rounded" />
            </div>
            <div className="pt-3 border-t border-borderSubtle flex justify-between">
              <div className="h-3 w-24 bg-surfaceElevated rounded" />
              <div className="h-3 w-16 bg-surfaceElevated rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
