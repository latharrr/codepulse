import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { getQueues } from '../queues';

const logger = createLogger('worker:processor:nightlyRefresh');

export async function nightlyRefreshProcessor(_job: Job) {
  logger.info('Starting nightly refresh for all verified and active handles');
  const queues = getQueues();

  try {
    const handles = await prisma.platformHandle.findMany({
      where: {
        status: 'ACTIVE',
        verificationState: 'VERIFIED',
      },
      select: {
        id: true,
        userId: true,
        platform: true,
        handle: true,
      },
    });

    logger.info({ count: handles.length }, 'Found handles for nightly refresh');

    for (const h of handles) {
      const jobData = {
        handleId: h.id,
        userId: h.userId,
        platform: h.platform,
        handle: h.handle,
        reason: 'scheduled' as const,
      };

      if (h.platform === 'GITHUB') {
        await queues.fetchGithub.add(`nightly-${h.id}`, jobData);
      } else if (h.platform === 'CODEFORCES') {
        await queues.fetchCodeforces.add(`nightly-${h.id}`, jobData);
      } else if (h.platform === 'LEETCODE') {
        await queues.fetchLeetcode.add(`nightly-${h.id}`, jobData);
      }
    }

    return { enqueued: handles.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Nightly refresh failed');
    throw error;
  }
}
