/**
 * Platform-related types and Zod schemas.
 */
import { z } from 'zod';

export const PlatformSchema = z.enum(['GITHUB', 'CODEFORCES', 'LEETCODE']);
export type Platform = z.infer<typeof PlatformSchema>;

export const VerificationStateSchema = z.enum([
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'RE_CHECK',
  'FLAGGED',
  'REJECTED',
]);
export type VerificationState = z.infer<typeof VerificationStateSchema>;

export const VerificationMethodSchema = z.enum(['OAUTH', 'BIO_TOKEN', 'MANUAL']);
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

export const HandleStatusSchema = z.enum(['ACTIVE', 'DEAD', 'DISABLED']);
export type HandleStatus = z.infer<typeof HandleStatusSchema>;

export const PlatformHandleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  platform: PlatformSchema,
  handle: z.string(),
  verificationState: VerificationStateSchema,
  verificationMethod: VerificationMethodSchema.nullable(),
  verificationToken: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  lastFetchedAt: z.date().nullable(),
  lastSuccessAt: z.date().nullable(),
  consecutiveFailures: z.number().int().min(0),
  status: HandleStatusSchema,
  createdAt: z.date(),
});
export type PlatformHandle = z.infer<typeof PlatformHandleSchema>;

/** Public-facing handle data (no tokens/internal fields) */
export const PublicHandleSchema = PlatformHandleSchema.omit({
  verificationToken: true,
  oauthTokenEncrypted: true,
} as never).extend({
  verificationToken: z.string().nullable().optional(),
});
export type PublicHandle = z.infer<typeof PublicHandleSchema>;
