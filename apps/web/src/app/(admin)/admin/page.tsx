import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { redirect } from 'next/navigation';
import { triggerRankRecompute, triggerSyncAll } from './actions';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const session = await auth();

  // Extra safety check (middleware already handles this)
  if (
    !session?.user ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/dashboard');
  }

  const stats = await prisma.$transaction([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.platformHandle.count(),
    prisma.institution.count(),
  ]);

  const statusMessage =
    searchParams?.status === 'sync-queued'
      ? 'Full platform sync has been queued.'
      : searchParams?.status === 'ranks-queued'
        ? 'Rank recomputation has been queued.'
        : null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {statusMessage && (
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Total Students</p>
          <p className="text-4xl font-bold">{stats[0]}</p>
        </div>
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Connected Handles</p>
          <p className="text-4xl font-bold">{stats[1]}</p>
        </div>
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Institutions</p>
          <p className="text-4xl font-bold">{stats[2]}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <form action={triggerSyncAll}>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Sync All Data
            </button>
          </form>
          <form action={triggerRankRecompute}>
            <button
              type="submit"
              className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground"
            >
              Recompute Ranks
            </button>
          </form>
          <a
            href="/api/admin/export"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Export Reports
          </a>
        </div>
      </div>
    </div>
  );
}
