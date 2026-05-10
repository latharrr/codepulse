import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger, getEnv } from '@codepulse/config';
import { VerifyHandleJob } from '@codepulse/types';
import { GitHubAdapter, CodeforcesAdapter, LeetCodeAdapter } from '@codepulse/adapters';
import { getQueues } from '../queues';
import { isCurrentVerificationJob } from './handleState';

const logger = createLogger('worker:processor:verifyHandle');

export async function verifyHandleProcessor(job: Job<VerifyHandleJob>) {
  const { handleId, userId, platform, handle, verificationToken } = job.data;
  const env = getEnv();
  const queues = getQueues();

  logger.info({ handleId, handle, platform }, 'Starting bio token verification');

  let verified = false;

  try {
    const stillCurrent = await isCurrentVerificationJob(job.data);
    if (!stillCurrent) {
      logger.info({ handleId, handle, platform }, 'Skipping stale verification job');
      return { verified: false, stale: true };
    }

    if (platform === 'GITHUB') {
      const adapter = new GitHubAdapter(env.GITHUB_PAT_POOL);
      verified = await adapter.verifyBioToken(handle, verificationToken);
    } else if (platform === 'CODEFORCES') {
      const adapter = new CodeforcesAdapter();
      verified = await adapter.verifyBioToken(handle, verificationToken);
    } else if (platform === 'LEETCODE') {
      const adapter = new LeetCodeAdapter();
      verified = await adapter.verifyBioToken(handle, verificationToken);
    }

    if (verified) {
      const stillCurrentAfterFetch = await isCurrentVerificationJob(job.data);
      if (!stillCurrentAfterFetch) {
        logger.info({ handleId, handle, platform }, 'Skipping stale verification result');
        return { verified: false, stale: true };
      }

      await prisma.platformHandle.update({
        where: { id: handleId },
        data: {
          verificationState: 'VERIFIED',
          verifiedAt: new Date(),
          consecutiveFailures: 0,
        },
      });

      logger.info({ handleId, handle, platform }, 'Handle successfully verified');

      // Enqueue the first initial fetch
      if (platform === 'GITHUB') {
        await queues.fetchGithub.add(`initial-${handleId}`, {
          handleId,
          userId,
          platform,
          handle,
          reason: 'initial',
        });
      } else if (platform === 'CODEFORCES') {
        await queues.fetchCodeforces.add(`initial-${handleId}`, {
          handleId,
          userId,
          platform,
          handle,
          reason: 'initial',
        });
      } else if (platform === 'LEETCODE') {
        await queues.fetchLeetcode.add(`initial-${handleId}`, {
          handleId,
          userId,
          platform,
          handle,
          reason: 'initial',
        });
      }

      return { verified: true };
    } else {
      const stillCurrentAfterFetch = await isCurrentVerificationJob(job.data);
      if (!stillCurrentAfterFetch) {
        logger.info(
          { handleId, handle, platform },
          'Skipping stale verification failure',
        );
        return { verified: false, stale: true };
      }

      // Failed verification
      const handleRecord = await prisma.platformHandle.update({
        where: { id: handleId },
        data: {
          consecutiveFailures: { increment: 1 },
        },
        select: { consecutiveFailures: true },
      });

      if (handleRecord.consecutiveFailures >= 3) {
        await prisma.platformHandle.update({
          where: { id: handleId },
          data: { verificationState: 'FLAGGED' },
        });
        logger.warn(
          { handleId, handle, platform },
          'Handle verification flagged after 3 failures',
        );
      } else {
        logger.info(
          { handleId, handle, platform, failures: handleRecord.consecutiveFailures },
          'Handle verification failed, token not found',
        );
      }

      return { verified: false };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg, handleId }, 'Verification process encountered an error');
    throw error;
  }
}
