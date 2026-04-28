/**
 * Recompute Score Processor
 */
import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { RecomputeScoreJob } from '@codepulse/types';
import { DefaultScoreEngine } from '@codepulse/scoring';

const logger = createLogger({ module: 'worker:processor:scoring' });

export async function recomputeScoreProcessor(job: Job<RecomputeScoreJob>) {
  const { userId } = job.data;
  
  const engine = new DefaultScoreEngine();

  try {
    // 1. Fetch all normalized metrics for the user
    const handles = await prisma.platformHandle.findMany({
      where: { userId, state: 'ACTIVE' },
      include: {
        metrics: true
      }
    });

    const metricsList = handles
      .map(h => h.metrics)
      .filter(m => m !== null)
      .map(m => m!.metrics as any);

    // 2. Compute Score
    const score = engine.compute(metricsList);
    
    // 3. Save to Database
    await prisma.score.upsert({
      where: { userId },
      create: {
        userId,
        codepulseScore: score.total,
        components: score.components as any,
        verificationMult: 1.0,
        recencyDecay: 1.0,
        scoringVersion: '1.0.0',
      },
      update: {
        codepulseScore: score.total,
        components: score.components as any,
        computedAt: new Date(),
      }
    });

    // Also update cached fields on User for fast display
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Placeholder for direct fields on user if we want them there too
      }
    });

    logger.info({ userId, total: score.total }, 'User score recomputed');
    
    return score;
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Score recompute failed');
    throw error;
  }
}
