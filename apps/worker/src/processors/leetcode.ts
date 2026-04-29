/**
 * LeetCode Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { FetchProfileJob } from '@codepulse/types';
import { LeetCodeAdapter, snapshotStore } from '@codepulse/adapters';
import { LeetCodeNormalizer } from '@codepulse/normalizer';
import { queues } from '../index';

const logger = createLogger('worker:processor:leetcode');

export async function fetchLeetcodeProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  const startTime = Date.now();
  
  const adapter = new LeetCodeAdapter();
  const normalizer = new LeetCodeNormalizer();

  try {
    const rawProfile = await adapter.fetchProfile(handle);
    const { storageKey, payloadHash } = await snapshotStore.put(`leetcode_${handle}`, rawProfile);
    
    const metrics = normalizer.normalize(rawProfile);
    const durationMs = Date.now() - startTime;
    
    await prisma.$transaction([
      prisma.normalizedMetric.upsert({
        where: { userId_platform: { userId, platform: 'LEETCODE' } },
        create: {
          userId,
          platform: 'LEETCODE',
          solvedEasy: metrics.solvedEasy,
          solvedMedium: metrics.solvedMedium,
          solvedHard: metrics.solvedHard,
          contestRating: metrics.contestRating,
          peakRating: metrics.peakRating,
          contestsAttended: metrics.contestsAttended,
          topicMastery: metrics.topicMastery as any,
          activeDays90: metrics.activeDays90,
          currentStreak: metrics.currentStreak,
          longestStreak: metrics.longestStreak,
          lastActiveAt: metrics.lastActiveAt,
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
          topicMastery: metrics.topicMastery as any,
          activeDays90: metrics.activeDays90,
          currentStreak: metrics.currentStreak,
          longestStreak: metrics.longestStreak,
          lastActiveAt: metrics.lastActiveAt,
          badges: metrics.badges as any,
          platformPercentile: metrics.platformPercentile,
          normalizerVersion: metrics.normalizerVersion,
          computedAt: new Date(),
        }
      }),
      prisma.platformHandle.update({
        where: { id: handleId },
        data: { lastFetchedAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0 }
      }),
      prisma.snapshot.create({
        data: {
          handleId,
          storageKey,
          payloadHash,
          fetchStatus: 'OK',
          scraperVersion: adapter.version,
          durationMs,
        }
      })
    ]);

    await queues.recomputeScore.add(`recompute-${userId}`, { userId });

    return metrics;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const { storageKey, payloadHash } = await snapshotStore.put(`leetcode_${handle}_error`, { error: error.message || 'Unknown error' });
    
    await prisma.snapshot.create({
      data: {
        handleId,
        storageKey,
        payloadHash,
        fetchStatus: 'FAILED',
        errorCode: error.code || 'UNKNOWN',
        scraperVersion: adapter.version,
        durationMs,
      }
    });

    logger.error({ error: error.message, handle }, 'LeetCode fetch failed');
    throw error;
  }
}
