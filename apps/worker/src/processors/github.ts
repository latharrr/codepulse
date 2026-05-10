/**
 * GitHub Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger, getEnv } from '@codepulse/config';
import { FetchProfileJob } from '@codepulse/types';
import { GitHubAdapter, snapshotStore } from '@codepulse/adapters';
import { GitHubNormalizer } from '@codepulse/normalizer';
import { getQueues } from '../queues';
import { isCurrentVerifiedFetchJob } from './handleState';

const logger = createLogger('worker:processor:github');
export async function fetchGithubProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  const env = getEnv();
  const queues = getQueues();
  const startTime = Date.now();

  // 1. Initialize Adapter
  const adapter = new GitHubAdapter(env.GITHUB_PAT_POOL);
  const normalizer = new GitHubNormalizer();

  try {
    const stillCurrent = await isCurrentVerifiedFetchJob(job.data);
    if (!stillCurrent) {
      logger.info({ handleId, userId, handle }, 'Skipping stale GitHub fetch job');
      return { stale: true };
    }

    // 2. Fetch Raw Profile
    const rawProfile = await adapter.fetchProfile(handle);

    const stillCurrentAfterFetch = await isCurrentVerifiedFetchJob(job.data);
    if (!stillCurrentAfterFetch) {
      logger.info({ handleId, userId, handle }, 'Skipping stale GitHub fetch result');
      return { stale: true };
    }

    // 3. Store Snapshot
    const { storageKey, payloadHash } = await snapshotStore.put(
      `github_${handle}`,
      rawProfile,
    );

    // 4. Normalize
    const metrics = normalizer.normalize(rawProfile);
    const durationMs = Date.now() - startTime;

    // 5. Update Database
    await prisma.$transaction([
      prisma.normalizedMetric.upsert({
        where: { userId_platform: { userId, platform: 'GITHUB' } },
        create: {
          userId,
          platform: 'GITHUB',
          solvedEasy: metrics.solvedEasy,
          solvedMedium: metrics.solvedMedium,
          solvedHard: metrics.solvedHard,
          contestRating: metrics.contestRating,
          peakRating: metrics.peakRating,
          contestsAttended: metrics.contestsAttended,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topicMastery: metrics.topicMastery as any,
          activeDays90: metrics.activeDays90,
          currentStreak: metrics.currentStreak,
          longestStreak: metrics.longestStreak,
          lastActiveAt: metrics.lastActiveAt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          badges: metrics.badges as any,
          platformPercentile: metrics.platformPercentile,
          normalizerVersion: metrics.normalizerVersion,
        },
        update: {
          solvedEasy: metrics.solvedEasy,
          solvedMedium: metrics.solvedMedium,
          solvedHard: metrics.solvedHard,
          contestRating: metrics.contestRating,
          peakRating: metrics.peakRating,
          contestsAttended: metrics.contestsAttended,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topicMastery: metrics.topicMastery as any,
          activeDays90: metrics.activeDays90,
          currentStreak: metrics.currentStreak,
          longestStreak: metrics.longestStreak,
          lastActiveAt: metrics.lastActiveAt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          badges: metrics.badges as any,
          platformPercentile: metrics.platformPercentile,
          normalizerVersion: metrics.normalizerVersion,
          computedAt: new Date(),
        },
      }),
      prisma.platformHandle.update({
        where: { id: handleId },
        data: {
          lastFetchedAt: new Date(),
          lastSuccessAt: new Date(),
          consecutiveFailures: 0,
        },
      }),
      prisma.snapshot.create({
        data: {
          handleId,
          storageKey,
          payloadHash,
          fetchStatus: 'OK',
          scraperVersion: adapter.version,
          durationMs,
        },
      }),
    ]);

    // 6. Trigger Recompute Score
    await queues.recomputeScore.add(`recompute-${userId}`, { userId });
    logger.info({ userId, handle }, 'GitHub fetch complete, score recompute triggered');

    return metrics;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const errCode = ((error as Record<string, unknown>).code as string) || 'UNKNOWN';
    const durationMs = Date.now() - startTime;

    const stillCurrent = await isCurrentVerifiedFetchJob(job.data);
    if (!stillCurrent) {
      logger.info(
        { handleId, userId, handle, error: msg },
        'Skipping stale GitHub fetch failure',
      );
      return { stale: true };
    }

    const { storageKey, payloadHash } = await snapshotStore.put(
      `github_${handle}_error`,
      { error: msg },
    );

    await prisma.snapshot.create({
      data: {
        handleId,
        storageKey,
        payloadHash,
        fetchStatus: 'FAILED',
        errorCode: errCode,
        scraperVersion: adapter.version,
        durationMs,
      },
    });

    if (errCode === 'NOT_FOUND') {
      const handleRecord = await prisma.platformHandle.update({
        where: { id: handleId },
        data: { consecutiveFailures: { increment: 1 } },
      });

      if (handleRecord.consecutiveFailures >= 3) {
        await prisma.platformHandle.update({
          where: { id: handleId },
          data: { status: 'DEAD' },
        });
        logger.warn(
          { handleId, handle },
          'GitHub handle marked as DEAD after 3 NOT_FOUND errors',
        );
      }
    } else {
      await prisma.platformHandle.update({
        where: { id: handleId },
        data: { consecutiveFailures: { increment: 1 } },
      });
    }

    logger.error({ error: msg, handle }, 'GitHub fetch failed');
    throw error;
  }
}
