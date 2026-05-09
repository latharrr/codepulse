/**
 * Recompute Score Processor
 *
 * Fetches all NormalizedMetric rows for a user, runs the scoring engine,
 * and upserts the result into the Score table.
 * After the score is saved, enqueues a rank recompute job.
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { RecomputeScoreJob } from '@codepulse/types';
import { DefaultScoreEngine } from '@codepulse/scoring';
import { getQueues } from '../queues';

const logger = createLogger('worker:processor:scoring');

export async function recomputeScoreProcessor(job: Job<RecomputeScoreJob>) {
  const { userId } = job.data;
  const engine = new DefaultScoreEngine();
  const queues = getQueues();

  try {
    // 1. Fetch all normalized metrics for this user
    const metricRows = await prisma.normalizedMetric.findMany({
      where: { userId },
    });

    // 2. Fetch handle counts to compute verificationMult
    const [totalHandles, verifiedHandles] = await Promise.all([
      prisma.platformHandle.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.platformHandle.count({
        where: { userId, status: 'ACTIVE', verificationState: 'VERIFIED' },
      }),
    ]);
    const verificationMult =
      totalHandles > 0 ? Math.max(0.5, verifiedHandles / totalHandles) : 0.5;

    // 3. Cast Prisma rows to NormalizedMetric shape the engine expects
    const metrics = metricRows.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        ...row,
        contestRating: row.contestRating ?? null,
        peakRating: row.peakRating ?? null,
        lastActiveAt: row.lastActiveAt ?? null,
        platformPercentile:
          row.platformPercentile !== null ? Number(row.platformPercentile) : null,
        topicMastery: (row.topicMastery as Record<string, number>) ?? {},
        badges: (row.badges as unknown[]) ?? [],
      };
    });

    // 4. Compute score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const score = engine.compute(metrics as any, verificationMult);

    // 5. Upsert Score row
    await prisma.score.upsert({
      where: { userId },
      create: {
        userId,
        codepulseScore: score.total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components: score.components as any,
        verificationMult: score.verificationMult,
        recencyDecay: score.recencyDecay,
        scoringVersion: score.scoringVersion,
        computedAt: score.computedAt,
      },
      update: {
        codepulseScore: score.total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components: score.components as any,
        verificationMult: score.verificationMult,
        recencyDecay: score.recencyDecay,
        scoringVersion: score.scoringVersion,
        computedAt: score.computedAt,
      },
    });

    // 6. Enqueue Rank Recompute
    // Using a jobId to debounce: if multiple scores update rapidly, we just do one rank recompute
    await queues.recomputeRanks.add(
      'global-recompute',
      {},
      { jobId: 'global-recompute', delay: 10000, removeOnComplete: true },
    );

    logger.info(
      { userId, total: score.total, verificationMult },
      'User score recomputed',
    );

    return { total: score.total, components: score.components };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg, userId }, 'Score recompute failed');
    throw error;
  }
}
