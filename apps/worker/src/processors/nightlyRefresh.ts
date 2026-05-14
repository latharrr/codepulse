import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { getQueues } from '../queues';

const logger = createLogger('worker:processor:nightlyRefresh');

/**
 * Skip handles that synced successfully within this window. A manual admin
 * "Sync All" 4 hours before the nightly cron should not re-spend GitHub
 * tokens on the same handles.
 */
const SKIP_IF_SYNCED_WITHIN_MS = 20 * 60 * 60 * 1000; // 20 hours

type NightlyRefreshJobData = {
  /**
   * Optional institutionId. If provided, only this tenant's handles are
   * refreshed (used by per-institution admin sync). null = all tenants.
   */
  institutionId?: string | null;
};

export async function nightlyRefreshProcessor(job: Job<NightlyRefreshJobData>) {
  const institutionId = job.data?.institutionId ?? null;
  logger.info(
    { institutionId },
    'Starting nightly refresh for verified active handles',
  );
  const queues = getQueues();

  try {
    const cutoff = new Date(Date.now() - SKIP_IF_SYNCED_WITHIN_MS);
    const handles = await prisma.platformHandle.findMany({
      where: {
        status: 'ACTIVE',
        verificationState: 'VERIFIED',
        OR: [{ lastSuccessAt: null }, { lastSuccessAt: { lt: cutoff } }],
        user: {
          status: 'ACTIVE',
          ...(institutionId ? { institutionId } : {}),
        },
      },
      select: {
        id: true,
        userId: true,
        platform: true,
        handle: true,
      },
    });

    logger.info({ count: handles.length }, 'Enqueueing fetch jobs');

    for (const h of handles) {
      const jobData = {
        handleId: h.id,
        userId: h.userId,
        platform: h.platform,
        handle: h.handle,
        reason: 'scheduled' as const,
      };

      // Stable jobId per handle per day so two overlapping nightly runs
      // (long-running previous + fresh cron) don't double-enqueue.
      const dayKey = new Date().toISOString().slice(0, 10);
      const jobId = `nightly-${h.id}-${dayKey}`;
      const opts = { jobId };

      if (h.platform === 'GITHUB') {
        await queues.fetchGithub.add(jobId, jobData, opts);
      } else if (h.platform === 'CODEFORCES') {
        await queues.fetchCodeforces.add(jobId, jobData, opts);
      } else if (h.platform === 'LEETCODE') {
        await queues.fetchLeetcode.add(jobId, jobData, opts);
      }
    }

    return { enqueued: handles.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Nightly refresh failed');
    throw error;
  }
}
