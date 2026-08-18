import type { StoreConfig } from "@/lib/stores/config";

// This is a loading skeleton for the store pages
export default function StoreLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "#0a0a0f" }}>
      {/* Header Skeleton */}
      <div className="h-16 border-b border-white/10" />

      {/* Hero Skeleton */}
      <div className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/50 to-transparent" />
        <div className="page-shell relative flex items-center py-20">
          <div className="max-w-2xl space-y-6">
            <div className="h-6 w-32 rounded-full bg-white/10" />
            <div className="h-16 w-80 rounded-lg bg-white/10" />
            <div className="flex gap-4">
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="h-4 w-16 rounded bg-white/10" />
            </div>
            <div className="h-20 w-full max-w-lg rounded bg-white/10" />
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="page-shell py-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="h-11 w-64 rounded-xl bg-white/5" />
            <div className="h-11 w-32 rounded-xl bg-white/5" />
            <div className="h-11 w-32 rounded-xl bg-white/5" />
          </div>
          <div className="h-10 w-20 rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Movie Grid Skeleton */}
      <div className="page-shell pb-20">
        <div className="mb-6 h-6 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] rounded-2xl bg-white/5" />
              <div className="h-4 w-3/4 rounded bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
