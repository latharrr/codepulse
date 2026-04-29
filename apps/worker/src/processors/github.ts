/**
 * GitHub Fetch Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger, getEnv } from '@codepulse/config';
import { FetchProfileJob, QUEUE_NAMES } from '@codepulse/types';
import { GitHubAdapter, snapshotStore } from '@codepulse/adapters';
import { GitHubNormalizer } from '@codepulse/normalizer';
import { queues } from '../index';

const logger = createLogger('worker:processor:github');
export async function fetchGithubProcessor(job: Job<FetchProfileJob>) {
  const { handle, handleId, userId } = job.data;
  const env = getEnv();
  const startTime = Date.now();
  
  // 1. Initialize Adapter
  const adapter = new GitHubAdapter(env.GITHUB_PAT_POOL);
  const normalizer = new GitHubNormalizer();

  try {
    // 2. Fetch Raw Profile
    const rawProfile = await adapter.fetchProfile(handle);
    
    // 3. Store Snapshot
    const { storageKey, payloadHash } = await snapshotStore.put(`github_${handle}`, rawProfile);

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

    // 6. Trigger Recompute Score
    await queues.recomputeScore.add(`recompute-${userId}`, { userId });
    logger.info({ userId, handle }, 'GitHub fetch complete, score recompute triggered');
    
    return metrics;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const { storageKey, payloadHash } = await snapshotStore.put(`github_${handle}_error`, { error: error.message || 'Unknown error' });
    
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

    logger.error({ error: error.message, handle }, 'GitHub fetch failed');
    throw error;
  }
}
