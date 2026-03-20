/**
 * TabSkeleton — Neumorphic skeleton placeholder for lazy-loaded tabs.
 *
 * Matches the dashboard's neumorphic card aesthetic with CSS shimmer animation.
 * Used as the <Suspense> fallback while tab chunks are loading.
 */

export default function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-6">
      {/* Section header skeleton */}
      <div className="flex items-center gap-2 px-1">
        <div className="skeleton-shimmer w-1 h-4 rounded-full" />
        <div className="skeleton-shimmer h-3 rounded-md w-36" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: "var(--neu-bg-raised)",
              boxShadow:
                "4px 4px 10px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="skeleton-shimmer w-4 h-4 rounded" />
              <div className="skeleton-shimmer h-2.5 rounded w-20" />
            </div>
            <div className="skeleton-shimmer h-7 rounded-md w-24" />
          </div>
        ))}
      </div>

      {/* Chart card skeleton */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--neu-bg-raised)",
          boxShadow:
            "4px 4px 10px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer w-1 h-4 rounded-full" />
            <div className="skeleton-shimmer h-3 rounded-md w-44" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton-shimmer h-6 rounded-md w-16" />
            <div className="skeleton-shimmer h-6 rounded-md w-16" />
          </div>
        </div>
        <div className="skeleton-shimmer h-64 rounded-lg w-full" />
      </div>

      {/* Second chart card skeleton */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--neu-bg-raised)",
          boxShadow:
            "4px 4px 10px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton-shimmer w-1 h-4 rounded-full" />
          <div className="skeleton-shimmer h-3 rounded-md w-32" />
        </div>
        <div className="skeleton-shimmer h-48 rounded-lg w-full" />
      </div>
    </div>
  );
}
