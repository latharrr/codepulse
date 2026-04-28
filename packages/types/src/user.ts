/**
 * User-related types and Zod schemas.
 */
import { z } from 'zod';

export const UserRoleSchema = z.enum(['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  email: z.string().email(),
  regno: z.string(),
  fullName: z.string(),
  branch: z.string().nullable(),
  section: z.string().nullable(),
  batchYear: z.number().int().nullable(),
  currentYear: z.number().int().min(1).max(5).nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  visibility: z.record(z.boolean()),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

/** Onboarding wizard input */
export const OnboardingInputSchema = z.object({
  regno: z
    .string()
    .min(1, 'Registration number is required')
    .max(20, 'Registration number too long'),
  branch: z.string().min(1, 'Branch is required').max(50),
  section: z.string().max(10).optional(),
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

/** Visibility update payload */
export const VisibilityUpdateSchema = z.object({
  github: z.boolean().optional(),
  codeforces: z.boolean().optional(),
  leetcode: z.boolean().optional(),
});
export type VisibilityUpdate = z.infer<typeof VisibilityUpdateSchema>;
