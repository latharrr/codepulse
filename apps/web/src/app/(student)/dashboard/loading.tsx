/**
 * Dashboard skeleton — shown while the server component fetches user + score
 * + handles + metrics. Without this, users see a blank screen during the
 * Prisma round-trip.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0A0A0B]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="h-9 w-32 animate-pulse rounded-xl bg-white/5" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/5" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/5" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-[300px] animate-pulse rounded-3xl bg-slate-900/70" />
          <div className="h-[300px] animate-pulse rounded-3xl bg-slate-900/70" />
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-900/70"
            />
          ))}
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-slate-900/70"
            />
          ))}
        </section>
      </main>
    </div>
  );
}
