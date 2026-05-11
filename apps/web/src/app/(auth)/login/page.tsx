import type { Metadata } from 'next';
import { signIn } from '@/auth';
import { prisma } from '@codepulse/db';
import { getOrCreateDefaultInstitution } from '@/lib/institution';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to CodePulse with your Google account.',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy via-brand-accent to-blue-600 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-8 shadow-2xl animate-fade-in">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
              <svg
                className="h-7 w-7"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="2"
                  y="20"
                  width="6"
                  height="18"
                  rx="1"
                  fill="white"
                  fillOpacity="0.6"
                />
                <rect
                  x="11"
                  y="12"
                  width="6"
                  height="26"
                  rx="1"
                  fill="white"
                  fillOpacity="0.8"
                />
                <rect x="20" y="6" width="6" height="32" rx="1" fill="white" />
                <rect
                  x="29"
                  y="14"
                  width="6"
                  height="24"
                  rx="1"
                  fill="white"
                  fillOpacity="0.7"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to CodePulse</h1>
              <p className="mt-1 text-sm text-white/60">
                Choose a demo role to enter
              </p>
            </div>
          </div>

          {/* Demo Bypass — TEMPORARY: Google sign-in disabled for the senior-faculty demo */}
          <div>
            <p className="mb-3 text-center text-xs font-semibold text-yellow-200/80 uppercase tracking-wider">
              Demo Quick Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <form
                action={async () => {
                  'use server';
                  await signIn('credentials', {
                    email: 'deepanshulathar@gmail.com',
                    redirectTo: '/admin',
                  });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
                >
                  Enter as Admin
                </button>
              </form>
              <form
                action={async () => {
                  'use server';
                  // Ensure the demo student exists with full onboarding data
                  // so the demo lands on /dashboard, not /onboarding.
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
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
                >
                  Enter as Student
                </button>
              </form>
            </div>
            <form
              action={async (formData) => {
                'use server';
                const email = formData.get('email') as string;
                await signIn('credentials', { email, redirectTo: '/dashboard' });
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="email"
                name="email"
                placeholder="custom@email.com"
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 ring-1 ring-white/20 focus:outline-none focus:ring-white/50"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
              >
                Go
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Google sign-in is temporarily disabled for the demo.
          </p>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-white/30">
          CodePulse Phase 1 MVP · LPU Pilot
        </p>
      </div>
    </main>
  );
}
