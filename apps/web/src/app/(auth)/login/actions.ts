'use server';

import { signIn } from '@/auth';
import { prisma } from '@codepulse/db';
import { getOrCreateDefaultInstitution } from '@/lib/institution';

// TEMPORARY: demo bypass actions — remove after the senior-faculty demo.

export async function signInAsAdmin() {
  await signIn('credentials', {
    email: 'deepanshulathar@gmail.com',
    redirectTo: '/admin',
  });
}

export async function signInAsDemoStudent() {
  // Ensure the demo student exists with full onboarding data so they
  // land on /dashboard rather than being routed through /onboarding.
  const institution = await getOrCreateDefaultInstitution();
  await prisma.user.upsert({
    where: { email: 'aarav.sharma@lpu.in' },
    update: {
      regno: '12420001',
      fullName: 'Aarav Sharma',
      branch: 'CSE',
      section: 'K21',
      batchYear: 2024,
      currentYear: 1,
    },
    create: {
      email: 'aarav.sharma@lpu.in',
      regno: '12420001',
      fullName: 'Aarav Sharma',
      branch: 'CSE',
      section: 'K21',
      batchYear: 2024,
      currentYear: 1,
      role: 'STUDENT',
      institutionId: institution.id,
    },
  });
  await signIn('credentials', {
    email: 'aarav.sharma@lpu.in',
    redirectTo: '/dashboard',
  });
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  await signIn('credentials', { email, redirectTo: '/dashboard' });
}
