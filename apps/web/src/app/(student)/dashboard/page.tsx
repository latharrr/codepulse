import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your CodePulse student dashboard — coding activity overview.',
};

/**
 * Student Dashboard — Phase 1 MVP
 *
 * Scaffold with hero, KPI cards, platform tiles, and chart areas.
 * Data fetching via TanStack Query hooks will be wired in Step 6.
 */
import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      score: true,
      handles: true,
      metrics: true,
    }
  });

  if (!user) redirect('/login');

  const score = user.score;
  const activeHandles = user.handles.filter((h: any) => h.status === 'ACTIVE');
  const metrics = user.metrics;

  const totalSolved = metrics.reduce((acc: number, m: any) => acc + (m.solvedEasy || 0) + (m.solvedMedium || 0) + (m.solvedHard || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 40 40" fill="none">
                <rect x="2" y="20" width="6" height="18" rx="1" fill="currentColor" fillOpacity="0.6"/>
                <rect x="11" y="12" width="6" height="26" rx="1" fill="currentColor" fillOpacity="0.8"/>
                <rect x="20" y="6" width="6" height="32" rx="1" fill="currentColor"/>
                <rect x="29" y="14" width="6" height="24" rx="1" fill="currentColor" fillOpacity="0.7"/>
              </svg>
            </div>
            <span className="font-semibold text-foreground">CodePulse</span>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/dashboard" className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground bg-accent/10">Dashboard</a>
            <a href="/handles" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Handles</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-accent p-8 text-white shadow-xl score-glow animate-fade-in">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/60 uppercase tracking-wider">CodePulse Score</p>
              <p className="mt-1 text-7xl font-bold tracking-tight">
                {score ? Math.round(Number(score.codepulseScore)) : '—'}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                <span>Campus Rank: <strong className="text-white">—</strong></span>
                <span>Percentile: <strong className="text-white">—</strong></span>
                <span>Last updated: <strong className="text-white">{score ? new Date(score.computedAt).toLocaleTimeString() : 'Never'}</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Solved', value: totalSolved || '—', sub: 'problems across platforms', icon: '🧩' },
            { label: 'Active Handles', value: activeHandles.length, sub: 'connected platforms', icon: '✅' },
            { label: 'Best Rating', value: Math.max(...metrics.map((m: any) => m?.contestRating || 0), 0) || '—', sub: 'max rating found', icon: '🏆' },
            { label: 'Platform Rank', value: '—', sub: 'campus standing', icon: '📊' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <span className="text-2xl">{kpi.icon}</span>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Connected Platforms</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {user.handles.map((h: any) => (
              <div key={h.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{h.platform}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${h.verificationState === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {h.verificationState}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground">@{h.handle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {h.lastFetchedAt ? `Fetched ${new Date(h.lastFetchedAt).toLocaleTimeString()}` : 'Waiting for fetch...'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
