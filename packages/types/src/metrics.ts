/**
 * Normalized metrics types — canonical schema across all platforms.
 */
import { z } from 'zod';
import { PlatformSchema } from './platform';

/**
 * Canonical topic mastery map.
 * 40 tags covering standard competitive programming and software engineering topics.
 * Phase 2 will add weighted proficiency scores per tag.
 */
export const CANONICAL_TAGS = [
  'array', 'string', 'hash_table', 'dynamic_programming', 'math',
  'sorting', 'greedy', 'depth_first_search', 'breadth_first_search',
  'binary_search', 'two_pointers', 'sliding_window', 'backtracking',
  'tree', 'binary_tree', 'graph', 'heap', 'stack', 'queue', 'linked_list',
  'recursion', 'divide_and_conquer', 'bit_manipulation', 'trie',
  'union_find', 'segment_tree', 'binary_indexed_tree', 'shortest_path',
  'minimum_spanning_tree', 'topological_sort', 'number_theory',
  'combinatorics', 'geometry', 'simulation', 'implementation',
  'prefix_sum', 'monotonic_stack', 'monotonic_queue', 'matrix', 'other',
] as const;

export type CanonicalTag = typeof CANONICAL_TAGS[number];

export const TopicMasterySchema = z.record(
  z.string(), // canonical tag name
  z.number().min(0).max(1), // mastery score 0..1
);
export type TopicMastery = z.infer<typeof TopicMasterySchema>;

export const NormalizedMetricSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  platform: PlatformSchema,
  solvedEasy: z.number().int().min(0),
  solvedMedium: z.number().int().min(0),
  solvedHard: z.number().int().min(0),
  contestRating: z.number().int().nullable(),
  peakRating: z.number().int().nullable(),
  contestsAttended: z.number().int().min(0),
  topicMastery: TopicMasterySchema,
  activeDays90: z.number().int().min(0).max(90),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActiveAt: z.date().nullable(),
  badges: z.array(z.unknown()),
  platformPercentile: z.number().min(0).max(100).nullable(),
  normalizerVersion: z.string(),
  computedAt: z.date(),
});
export type NormalizedMetric = z.infer<typeof NormalizedMetricSchema>;

/**
 * Adapter output type — what each platform adapter returns after normalization.
 * This is the canonical shape that the normalizer produces from raw API responses.
 */
export const NormalizedMetricsOutputSchema = NormalizedMetricSchema.omit({
  id: true,
  userId: true,
  computedAt: true,
});
export type NormalizedMetricsOutput = z.infer<typeof NormalizedMetricsOutputSchema>;
