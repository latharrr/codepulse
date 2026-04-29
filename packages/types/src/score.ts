/**
 * Score-related types.
 */
import { z } from 'zod';

export const ScoreComponentsSchema = z.object({
  dsa: z.number().min(0).max(1),
  contest: z.number().min(0).max(1),
  consistency: z.number().min(0).max(1),
  breadth: z.number().min(0).max(1),
  build: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
});
export type ScoreComponents = z.infer<typeof ScoreComponentsSchema>;

export const ScoreSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  codepulseScore: z.number().min(0).max(100),
  components: ScoreComponentsSchema,
  verificationMult: z.number().min(0).max(1),
  recencyDecay: z.number().min(0).max(1),
  scoringVersion: z.string(),
  computedAt: z.date(),
});
export type Score = z.infer<typeof ScoreSchema>;

/**
 * Output type from the scoring engine — what gets stored in the Score table.
 * No `level` field — level display is derived in the UI from codepulseScore ranges.
 */
export const CodePulseScoreSchema = z.object({
  total: z.number().min(0).max(100),
  components: ScoreComponentsSchema,
  verificationMult: z.number().min(0).max(1),
  recencyDecay: z.number().min(0).max(1),
  scoringVersion: z.string(),
  computedAt: z.date(),
});
export type CodePulseScore = z.infer<typeof CodePulseScoreSchema>;

export const RankScopeSchema = z.enum(['CAMPUS', 'YEAR', 'BRANCH', 'SECTION']);
export type RankScope = z.infer<typeof RankScopeSchema>;

export const RankSchema = z.object({
  userId: z.string().uuid(),
  scope: RankScopeSchema,
  scopeValue: z.string(),
  rank: z.number().int().min(1),
  percentile: z.number().min(0).max(100),
  cohortSize: z.number().int().min(1),
  computedAt: z.date(),
});
export type Rank = z.infer<typeof RankSchema>;
