/**
 * Server Actions for onboarding.
 *
 * Validates regno against institution config, saves user profile.
 * Returns typed ApiResponse — no exceptions bubble to the client.
 */
'use server';

import { auth, updateSession } from '@/auth';
import { prisma } from '@codepulse/db';
import { parseRegno, LPU_REGNO_CONFIG, OnboardingInputSchema } from '@codepulse/types';
import { normalizeEmail } from '@/lib/auth-rules';
import { getOrCreateDefaultInstitution } from '@/lib/institution';
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
  prevState: OnboardingActionResult,
  formData: FormData,
): Promise<OnboardingActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, error: 'Not authenticated. Please sign in again.' };
  }
  const email = normalizeEmail(session.user.email);

  // ── Parse form data ────────────────────────────────────────
  const section = formData.get('section')?.toString().trim();
  const raw = {
    regno: formData.get('regno')?.toString().trim() ?? '',
    branch: formData.get('branch')?.toString().trim() ?? '',
    section: section || undefined,
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
  const institution = await getOrCreateDefaultInstitution();

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
      NOT: { id: session.user.id },
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
  // Do NOT reassign `institutionId` on update — an admin may have moved
  // this user; preserve their existing institution. Only set it on first
  // sign-in (handled in ensureApplicationUser).
  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email,
        regno: regnoResult.regno,
        branch: parsed.data.branch,
        section: parsed.data.section ?? null,
        batchYear: regnoResult.batchYear,
        currentYear: regnoResult.currentYear,
      },
    });

    await updateSession({
      user: {
        id: user.id,
        role: user.role,
        regno: user.regno,
        institutionId: user.institutionId,
        onboardingComplete: true,
      },
    });
  } catch (e) {
    console.error('Onboarding upsert failed:', e);
    // Two users racing for the same regno collide on the
    // [institutionId, regno] unique constraint — return a field-level
    // error so the form can surface it.
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    ) {
      return {
        ok: false,
        error: 'This registration number is already linked to another account.',
        fieldErrors: { regno: 'Registration number already in use.' },
      };
    }
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
