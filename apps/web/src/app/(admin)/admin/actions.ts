'use server';

import { auth } from '@/auth';
import { prisma, Prisma } from '@codepulse/db';
import { queues } from '@/lib/queues';
import { redirect } from 'next/navigation';

type AdminCtx = {
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  institutionId: string;
};

async function requireAdmin(): Promise<AdminCtx> {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const institutionId = session?.user?.institutionId;

  if (
    !userId ||
    !institutionId ||
    (role !== 'ADMIN' && role !== 'SUPER_ADMIN')
  ) {
    redirect('/dashboard');
  }

  // Narrowing: redirect throws so anything below is type-safe.
  return {
    userId: userId as string,
    role: role as 'ADMIN' | 'SUPER_ADMIN',
    institutionId: institutionId as string,
  };
}

async function recordAdminAction(
  ctx: AdminCtx,
  action: string,
  payload: Prisma.InputJsonValue = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: ctx.userId,
        actorRole: ctx.role,
        action,
        targetType: 'institution',
        targetId: ctx.institutionId,
        payload,
      },
    });
  } catch (err) {
    console.error('[admin/actions] audit log failed:', err);
  }
}

export async function triggerSyncAll() {
  const ctx = await requireAdmin();

  // A stable jobId per minute prevents an admin button-mash from queuing
  // dozens of full-platform fetches.
  const bucket = Math.floor(Date.now() / 60_000);
  await queues.nightlyRefresh.add(
    `manual-nightly-${ctx.institutionId}-${bucket}`,
    { institutionId: ctx.role === 'SUPER_ADMIN' ? null : ctx.institutionId },
    {
      removeOnComplete: true,
      jobId: `manual-nightly-${ctx.institutionId}-${bucket}`,
    },
  );

  await recordAdminAction(ctx, 'admin.syncAll.triggered');
  redirect('/admin?status=sync-queued');
}

export async function triggerRankRecompute() {
  const ctx = await requireAdmin();

  const bucket = Math.floor(Date.now() / 60_000);
  await queues.recomputeRanks.add(
    `manual-ranks-${ctx.institutionId}-${bucket}`,
    {},
    {
      removeOnComplete: true,
      jobId: `manual-ranks-${ctx.institutionId}-${bucket}`,
    },
  );

  await recordAdminAction(ctx, 'admin.recomputeRanks.triggered');
  redirect('/admin?status=ranks-queued');
}
