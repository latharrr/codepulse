/**
 * API response envelope types.
 *
 * All API endpoints return a discriminated union:
 *   { ok: true, data: T } | { ok: false, error: string, details?: unknown }
 */
import { z } from 'zod';

/**
 * Success response wrapper
 */
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
  });

/**
 * Error response wrapper
 */
export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Generic API response — infer the concrete type from your data schema
 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown; code?: string };

/** Helper to construct success responses */
export const ok = <T>(data: T): ApiResponse<T> => ({ ok: true, data });

/** Helper to construct error responses */
export const err = (
  error: string,
  opts?: { details?: unknown; code?: string },
): ApiResponse<never> => ({
  ok: false,
  error,
  ...opts,
});

// ── Request schemas for POST endpoints ───────────────────────

export const AddHandleRequestSchema = z.object({
  platform: z.enum(['GITHUB', 'CODEFORCES', 'LEETCODE']),
  handle: z
    .string()
    .min(1, 'Handle is required')
    .max(100, 'Handle too long')
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Handle contains invalid characters'),
});
export type AddHandleRequest = z.infer<typeof AddHandleRequestSchema>;

export const AdminSearchQuerySchema = z.object({
  q: z.string().optional(),
  year: z.string().optional(),
  branch: z.string().optional(),
  verificationState: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('50'),
  sortBy: z
    .enum(['score', 'rank', 'lastActive', 'name', 'regno'])
    .default('score'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type AdminSearchQuery = z.infer<typeof AdminSearchQuerySchema>;
