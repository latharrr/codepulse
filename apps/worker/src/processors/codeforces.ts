/**
 * Codeforces Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { FetchProfileJob } from '@codepulse/types';
import { CodeforcesAdapter } from '@codepulse/adapters';
import { CodeforcesNormalizer } from '@codepulse/normalizer';
import { queues } from '../index';

const logger = createLogger({ module: 'worker:processor:codeforces' });

export async function fetchCodeforcesProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  
  const adapter = new CodeforcesAdapter();
  const normalizer = new CodeforcesNormalizer();

  try {
    const rawProfile = await adapter.fetchProfile(handle);
    const metrics = normalizer.normalize(rawProfile);
    
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
      })
    ]);

    await queues.recomputeScore.add(`recompute-${userId}`, { userId });

    return metrics;
  } catch (error: any) {
    logger.error({ error: error.message, handle }, 'Codeforces fetch failed');
    throw error;
  }
}
