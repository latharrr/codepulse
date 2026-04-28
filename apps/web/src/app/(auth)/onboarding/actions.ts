/**
 * Server Actions for onboarding.
 *
 * Validates regno against institution config, saves user profile.
 * Returns typed ApiResponse — no exceptions bubble to the client.
 */
'use server';

import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { parseRegno, LPU_REGNO_CONFIG, OnboardingInputSchema } from '@codepulse/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Completes the onboarding wizard — validates and saves regno/branch/section.
 * Called from the onboarding form Server Action.
 */
export async function completeOnboarding(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, error: 'Not authenticated. Please sign in again.' };
  }

  // ── Parse form data ────────────────────────────────────────
  const raw = {
    regno: formData.get('regno')?.toString() ?? '',
    branch: formData.get('branch')?.toString() ?? '',
    section: formData.get('section')?.toString() ?? '',
  };

  const parsed = OnboardingInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString();
      if (field) fieldErrors[field] = issue.message;
    }
    return { ok: false, error: 'Please fix the errors below.', fieldErrors };
  }

  // ── Load institution ───────────────────────────────────────
  // Phase 1: single institution (LPU). Phase 2: derive from email domain.
  const institution = await prisma.institution.findUnique({
    where: { slug: process.env.DEFAULT_INSTITUTION_SLUG ?? 'lpu' },
  });

  if (!institution) {
    return {
      ok: false,
      error: 'Institution configuration not found. Contact support.',
    };
  }

  // ── Parse regno ────────────────────────────────────────────
  // TODO Phase 2: load config from institution.regnoConfig instead of LPU_REGNO_CONFIG
  const regnoResult = parseRegno(parsed.data.regno, LPU_REGNO_CONFIG);
  if (!regnoResult.ok) {
    return {
      ok: false,
      error: regnoResult.error,
      fieldErrors: { regno: regnoResult.error },
    };
  }

  // ── Check regno uniqueness within institution ───────────────
  const existingByRegno = await prisma.user.findFirst({
    where: {
      institutionId: institution.id,
      regno: regnoResult.regno,
      NOT: { email: session.user.email },
    },
  });

  if (existingByRegno) {
    return {
      ok: false,
      error: 'This registration number is already linked to another account.',
      fieldErrors: { regno: 'Registration number already in use.' },
    };
  }

  // ── Upsert user profile ────────────────────────────────────
  try {
    await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        institutionId: institution.id,
        regno: regnoResult.regno,
        branch: parsed.data.branch,
        section: parsed.data.section ?? null,
        batchYear: regnoResult.batchYear,
        currentYear: regnoResult.currentYear,
      },
      create: {
        institutionId: institution.id,
        email: session.user.email,
        fullName: session.user.name ?? session.user.email,
        regno: regnoResult.regno,
        branch: parsed.data.branch,
        section: parsed.data.section ?? null,
        batchYear: regnoResult.batchYear,
        currentYear: regnoResult.currentYear,
        role: 'STUDENT',
        status: 'ACTIVE',
        visibility: {},
      },
    });
  } catch (e) {
    console.error('Onboarding upsert failed:', e);
    return { ok: false, error: 'Failed to save profile. Please try again.' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/** Returns the list of branches for the LPU institution. Phase 2: load from DB. */
export async function getBranches(): Promise<string[]> {
  return [
    'Computer Science & Engineering (CSE)',
    'Computer Science & Engineering (AI/ML)',
    'Computer Science & Engineering (Data Science)',
    'Computer Science & Engineering (Cyber Security)',
    'Electronics & Communication Engineering (ECE)',
    'Electrical Engineering (EE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'Chemical Engineering (ChE)',
    'Biotechnology (BT)',
    'Bachelor of Business Administration (BBA)',
    'Bachelor of Commerce (BCom)',
    'Master of Business Administration (MBA)',
    'Master of Computer Applications (MCA)',
    'Mathematics & Computing (MnC)',
    'Physics',
    'Chemistry',
    'Other',
  ];
}
