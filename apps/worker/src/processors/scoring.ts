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

const logger = createLogger('worker:processor:scoring');

export async function recomputeScoreProcessor(job: Job<RecomputeScoreJob>) {
  const { userId } = job.data;
  const engine = new DefaultScoreEngine();

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
      totalHandles > 0
        ? Math.max(0.5, verifiedHandles / totalHandles)
        : 0.5;

    // 3. Cast Prisma rows to NormalizedMetric shape the engine expects
    //    (topicMastery is Json in Prisma → cast to Record<string, number>)
    const metrics = metricRows.map((m: any) => ({
      ...m,
      contestRating: m.contestRating ?? null,
      peakRating: m.peakRating ?? null,
      lastActiveAt: m.lastActiveAt ?? null,
      platformPercentile:
        m.platformPercentile !== null
          ? Number(m.platformPercentile)
          : null,
      topicMastery: (m.topicMastery as Record<string, number>) ?? {},
      badges: (m.badges as unknown[]) ?? [],
    }));

    // 4. Compute score
    const score = engine.compute(metrics as any, verificationMult);

    // 5. Upsert Score row
    await prisma.score.upsert({
      where: { userId },
      create: {
        userId,
        codepulseScore: score.total,
        components: score.components as any,
        verificationMult: score.verificationMult,
        recencyDecay: score.recencyDecay,
        scoringVersion: score.scoringVersion,
        computedAt: score.computedAt,
      },
      update: {
        codepulseScore: score.total,
        components: score.components as any,
        verificationMult: score.verificationMult,
        recencyDecay: score.recencyDecay,
        scoringVersion: score.scoringVersion,
        computedAt: score.computedAt,
      },
    });

    logger.info(
      { userId, total: score.total, verificationMult },
      'User score recomputed',
    );

    return { total: score.total, components: score.components };
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Score recompute failed');
    throw error;
  }
}
