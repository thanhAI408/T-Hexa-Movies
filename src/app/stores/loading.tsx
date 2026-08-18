export default function StoresLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)" }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="page-shell relative pt-20 pb-16 text-center">
          <div className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div className="h-4 w-32 rounded bg-white/20" />
          </div>

          <div className="mt-8 h-16 w-96 rounded-lg bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400" style={{ opacity: 0.3 }} />
        </div>
      </div>

      {/* Store Cards Grid */}
      <div className="page-shell">
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="relative h-72 rounded-3xl border bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
