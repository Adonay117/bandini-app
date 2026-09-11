export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando dashboard">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      <div className="skeleton h-32 rounded-2xl sm:h-28" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[124px] rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>

      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}
