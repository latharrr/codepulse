import { Job } from 'bullmq';
import { prisma } from '@codepulse/db';
import { createLogger } from '@codepulse/config';
import { RecomputeRanksJob } from '@codepulse/types';

const logger = createLogger('worker:processor:ranks');

type RankInput = {
  userId: string;
  scope: 'CAMPUS' | 'YEAR' | 'BRANCH' | 'SECTION';
  scopeValue: string;
  rank: number;
  percentile: number;
  cohortSize: number;
};

export async function recomputeRanksProcessor(_job: Job<RecomputeRanksJob>) {
  logger.info('Starting global rank recomputation');
  
  try {
    // 1. Fetch all users with a computed score
    const usersWithScores = await prisma.user.findMany({
      where: { score: { isNot: null } },
      select: {
        id: true,
        institutionId: true,
        batchYear: true,
        branch: true,
        section: true,
        score: {
          select: { codepulseScore: true }
        }
      }
    });

    if (usersWithScores.length === 0) {
      logger.info('No users with scores found. Skipping rank recomputation.');
      return;
    }

    // Prepare groups: Map<scope_scopeValue, UserScore[]>
    type UserScore = { id: string; score: number };
    const groups = new Map<string, UserScore[]>();

    const addGroup = (scope: string, value: string | null | undefined, userScore: UserScore) => {
      if (!value) return;
      const key = `${scope}:::${value}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(userScore);
    };

    for (const u of usersWithScores) {
      const us = { id: u.id, score: Number(u.score!.codepulseScore) };
      
      // CAMPUS Scope
      addGroup('CAMPUS', u.institutionId, us);
      
      // YEAR Scope
      if (u.batchYear) addGroup('YEAR', u.batchYear.toString(), us);
      
      // BRANCH Scope
      if (u.branch) addGroup('BRANCH', u.branch, us);
      
      // SECTION Scope
      if (u.section) addGroup('SECTION', u.section, us);
    }

    const rankInputs: RankInput[] = [];

    // 2. Compute ranks for each group
    for (const [key, users] of groups.entries()) {
      const [scope, scopeValue] = key.split(':::') as [RankInput['scope'], string];
      
      // Sort descending by score
      users.sort((a, b) => b.score - a.score);
      
      const cohortSize = users.length;
      let currentRank = 1;
      
      for (let i = 0; i < cohortSize; i++) {
        const currentUser = users[i];
        if (!currentUser) continue;

        // Handle ties: if same score as previous, same rank. Otherwise rank = index + 1
        if (i > 0) {
          const prevUser = users[i - 1];
          if (prevUser && currentUser.score < prevUser.score) {
            currentRank = i + 1;
          }
        }
        
        const percentile = cohortSize > 1 
          ? ((cohortSize - currentRank) / cohortSize) * 100 
          : 100;

        rankInputs.push({
          userId: currentUser.id,
          scope,
          scopeValue,
          rank: currentRank,
          percentile,
          cohortSize
        });
      }
    }

    // 3. Atomically replace the Ranks table
    // For MVP, we can delete all ranks and re-insert. 
    // In a transaction, this is completely invisible to the frontend until committed.
    await prisma.$transaction(async (tx) => {
      await tx.rank.deleteMany({});
      
      // Insert in chunks of 5000 to avoid query size limits
      const chunkSize = 5000;
      for (let i = 0; i < rankInputs.length; i += chunkSize) {
        const chunk = rankInputs.slice(i, i + chunkSize);
        await tx.rank.createMany({
          data: chunk
        });
      }
    });

    logger.info({ computedRankRows: rankInputs.length }, 'Successfully recomputed and saved all ranks');

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Failed to recompute ranks');
    throw error;
  }
}
