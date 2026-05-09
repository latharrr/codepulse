/**
 * Codeforces Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { FetchProfileJob } from '@codepulse/types';
import { CodeforcesAdapter, snapshotStore } from '@codepulse/adapters';
import { CodeforcesNormalizer } from '@codepulse/normalizer';
import { getQueues } from '../queues';

const logger = createLogger('worker:processor:codeforces');

export async function fetchCodeforcesProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  const queues = getQueues();
  const startTime = Date.now();

  const adapter = new CodeforcesAdapter();
  const normalizer = new CodeforcesNormalizer();

  try {
    const rawProfile = await adapter.fetchProfile(handle);
    const { storageKey, payloadHash } = await snapshotStore.put(
      `codeforces_${handle}`,
      rawProfile,
    );

    const metrics = normalizer.normalize(rawProfile);
    const durationMs = Date.now() - startTime;

    await prisma.$transaction([
      prisma.normalizedMetric.upsert({
        where: { userId_platform: { userId, platform: 'CODEFORCES' } },
        create: {
          userId,
          platform: 'CODEFORCES',
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

    await queues.recomputeScore.add(`recompute-${userId}`, { userId });

    return metrics;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const errCode = ((error as Record<string, unknown>).code as string) || 'UNKNOWN';
    const durationMs = Date.now() - startTime;
    const { storageKey, payloadHash } = await snapshotStore.put(
      `codeforces_${handle}_error`,
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
          'Codeforces handle marked as DEAD after 3 NOT_FOUND errors',
        );
      }
    } else {
      await prisma.platformHandle.update({
        where: { id: handleId },
        data: { consecutiveFailures: { increment: 1 } },
      });
    }

    logger.error({ error: msg, handle }, 'Codeforces fetch failed');
    throw error;
  }
}
