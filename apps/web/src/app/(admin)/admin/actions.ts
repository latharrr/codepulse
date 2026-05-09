'use server';

import { auth } from '@/auth';
import { queues } from '@/lib/queues';
import { redirect } from 'next/navigation';

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
}

export async function triggerSyncAll() {
  await requireAdmin();

  await queues.nightlyRefresh.add(
    `manual-nightly-${Date.now()}`,
    {},
    { removeOnComplete: true },
  );

  redirect('/admin?status=sync-queued');
}

export async function triggerRankRecompute() {
  await requireAdmin();

  await queues.recomputeRanks.add(
    `manual-ranks-${Date.now()}`,
    {},
    { removeOnComplete: true },
  );

  redirect('/admin?status=ranks-queued');
}
