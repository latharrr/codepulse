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
import { ScoreRadarChart } from '@/components/score-radar-chart';
import {
  Trophy,
  Code2,
  CheckCircle2,
  Flame,
  TrendingUp,
  CalendarDays,
  Target,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      score: true,
      handles: true,
      metrics: true,
      ranks: {
        where: { scope: 'CAMPUS' },
        take: 1,
      },
    },
  });

  if (!user) redirect('/login');

  const score = user.score;
  const activeHandles = user.handles.filter(
    (h) => h.status === 'ACTIVE' && h.verificationState === 'VERIFIED',
  );
  const metrics = user.metrics;
  const campusRank = user.ranks[0];

  // Worker race: a user just verified their first handle but the fetch /
  // normalize / score pipeline hasn't completed yet. Tell them so the empty
  // dashboard isn't mistaken for a permanent state.
  const isSyncingFirstMetrics =
    user.handles.length > 0 && metrics.length === 0 && !score;

  const totalSolved = metrics.reduce(
    (acc: number, m) =>
      acc + (m.solvedEasy || 0) + (m.solvedMedium || 0) + (m.solvedHard || 0),
    0,
  );
  const maxStreak = Math.max(...metrics.map((m) => m?.longestStreak || 0), 0);
  const maxRating = Math.max(...metrics.map((m) => m?.contestRating || 0), 0);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-blue-500/30">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0A0A0B]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">CodePulse</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Dashboard
            </Link>
            <Link
              href="/handles"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              Handles
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {isSyncingFirstMetrics && (
          <div
            role="status"
            className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-200"
          >
            <p className="font-semibold">Syncing your first stats…</p>
            <p className="mt-1 text-blue-200/80">
              Your handles are verified — we&apos;re pulling activity now. This
              usually takes a few minutes. Refresh the page after a short
              while to see your CodePulse score.
            </p>
          </div>
        )}

        {/* Main Hero Score Section */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1 ring-1 ring-white/10 shadow-2xl">
            {/* Subtle glow effect */}
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative h-full rounded-[23px] bg-slate-950/40 backdrop-blur-sm p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Target className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Overall Score
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-4">
                  <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-400 drop-shadow-sm">
                    {score ? Math.round(Number(score.codepulseScore)) : '0'}
                  </h1>
                  <span className="text-xl font-medium text-slate-500">/ 100</span>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Campus Rank
                  </p>
                  <p className="text-2xl font-bold text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    {campusRank ? `#${campusRank.rank}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Percentile
                  </p>
                  <p className="text-2xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    {campusRank ? `P${Number(campusRank.percentile).toFixed(1)}` : '—'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Last Computed
                  </p>
                  <p className="text-sm font-medium text-slate-300 mt-2 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    {score
                      ? new Date(score.computedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart Section */}
          <div className="rounded-3xl bg-slate-900 border border-white/5 p-6 shadow-xl flex flex-col">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Score Analysis
            </h3>
            <div className="flex-1 min-h-[300px]">
              <ScoreRadarChart
                components={
                  score?.components as {
                    dsa?: number;
                    contest?: number;
                    consistency?: number;
                    breadth?: number;
                    build?: number;
                    recency?: number;
                  } | null
                }
              />
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Total Solved',
              value: totalSolved || '0',
              sub: 'Problems across platforms',
              icon: Code2,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10',
            },
            {
              label: 'Best Rating',
              value: maxRating || 'Unrated',
              sub: 'Highest contest rating',
              icon: Trophy,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'Max Streak',
              value: `${maxStreak} days`,
              sub: 'Longest coding streak',
              icon: Flame,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
            {
              label: 'Active Platforms',
              value: activeHandles.length,
              sub: 'Verified and syncing',
              icon: CheckCircle2,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-6 transition-all hover:bg-slate-900 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{kpi.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
                </div>
                <div
                  className={`rounded-xl ${kpi.bg} p-3 transition-transform group-hover:scale-110`}
                >
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Platforms */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Connected Platforms</h2>
            <Link
              href="/handles"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage Handles &rarr;
            </Link>
          </div>

          {user.handles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No platforms connected
              </h3>
              <p className="text-slate-400 mb-6">
                Link your GitHub, LeetCode, or Codeforces accounts to generate your score.
              </p>
              <Link
                href="/handles"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Connect Platform
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {user.handles.map((h) => {
                const metric = metrics.find((m) => m.platform === h.platform);
                return (
                  <div
                    key={h.id}
                    className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-900 p-6 transition-all hover:border-white/10 hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-lg text-white capitalize">
                          {h.platform.toLowerCase()}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            h.status === 'DEAD'
                              ? 'bg-red-500/10 text-red-400'
                              : h.verificationState === 'VERIFIED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : h.verificationState === 'FLAGGED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {h.status === 'DEAD' ? 'DEAD' : h.verificationState}
                        </span>
                      </div>
                      <p className="text-slate-300 font-medium">@{h.handle}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {h.lastFetchedAt
                          ? new Date(h.lastFetchedAt).toLocaleDateString()
                          : 'Pending fetch'}
                      </div>
                      {metric && (
                        <div className="text-xs font-semibold text-slate-400">
                          {metric.solvedEasy + metric.solvedMedium + metric.solvedHard}{' '}
                          solved
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
