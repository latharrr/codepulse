/**
 * BullMQ job payload types.
 *
 * Every job payload is typed and validated with Zod.
 * Workers use these schemas to safely parse job data.
 */
import { z } from 'zod';
import { PlatformSchema } from './platform';

// ── Queue names ───────────────────────────────────────────────

export const QUEUE_NAMES = {
  VERIFY_HANDLE: 'verify-handle',
  FETCH_GITHUB: 'fetch-github',
  FETCH_CODEFORCES: 'fetch-codeforces',
  FETCH_LEETCODE: 'fetch-leetcode',
  RECOMPUTE_SCORE: 'recompute-score',
  RECOMPUTE_RANKS: 'recompute-ranks',
  NIGHTLY_REFRESH: 'nightly-refresh',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// ── Job payloads ──────────────────────────────────────────────

export const VerifyHandleJobSchema = z.object({
  handleId: z.string().uuid(),
  userId: z.string().uuid(),
  platform: PlatformSchema,
  handle: z.string(),
  /** Bio token to look for in the platform profile bio */
  verificationToken: z.string(),
});
export type VerifyHandleJob = z.infer<typeof VerifyHandleJobSchema>;

export const FetchProfileJobSchema = z.object({
  handleId: z.string().uuid(),
  userId: z.string().uuid(),
  platform: PlatformSchema,
  handle: z.string(),
  /** Trigger reason for observability */
  reason: z.enum(['initial', 'scheduled', 'manual', 'retry']),
});
export type FetchProfileJob = z.infer<typeof FetchProfileJobSchema>;

export const RecomputeScoreJobSchema = z.object({
  userId: z.string().uuid(),
  /** Which platform triggered the recompute */
  triggeredByPlatform: PlatformSchema.optional(),
});
export type RecomputeScoreJob = z.infer<typeof RecomputeScoreJobSchema>;

export const RecomputeRanksJobSchema = z.object({
  /** If present, limits the recompute to a specific scope value, else recomputes all */
  scopeValue: z.string().optional(),
});
export type RecomputeRanksJob = z.infer<typeof RecomputeRanksJobSchema>;

/** Union of all job payloads */
export type JobPayload =
  | { queue: typeof QUEUE_NAMES.VERIFY_HANDLE; data: VerifyHandleJob }
  | { queue: typeof QUEUE_NAMES.FETCH_GITHUB; data: FetchProfileJob }
  | { queue: typeof QUEUE_NAMES.FETCH_CODEFORCES; data: FetchProfileJob }
  | { queue: typeof QUEUE_NAMES.FETCH_LEETCODE; data: FetchProfileJob }
  | { queue: typeof QUEUE_NAMES.RECOMPUTE_SCORE; data: RecomputeScoreJob }
  | { queue: typeof QUEUE_NAMES.RECOMPUTE_RANKS; data: RecomputeRanksJob };
