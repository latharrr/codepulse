/**
 * GitHub Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger, getEnv } from '@codepulse/config';
import { FetchProfileJob, QUEUE_NAMES } from '@codepulse/types';
import { GitHubAdapter } from '@codepulse/adapters';
import { GitHubNormalizer } from '@codepulse/normalizer';
import { queues } from '../index';

const logger = createLogger({ module: 'worker:processor:github' });
export async function fetchGithubProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  const env = getEnv();
  
  // 1. Initialize Adapter
  const adapter = new GitHubAdapter(env.GITHUB_PAT_POOL);
  const normalizer = new GitHubNormalizer();

  try {
    // 2. Fetch Raw Profile
    const rawProfile = await adapter.fetchProfile(handle);
    
    // 3. Normalize
    const metrics = normalizer.normalize(rawProfile);
    
    // 4. Update Database
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

    // 5. Trigger Recompute Score
    await queues.recomputeScore.add(`recompute-${userId}`, { userId });
    logger.info({ userId, handle }, 'GitHub fetch complete, score recompute triggered');
    
    return metrics;
  } catch (error: any) {
    logger.error({ error: error.message, handle }, 'GitHub fetch failed');
    throw error;
  }
}
