import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './OnboardingForm';
import { getBranches } from './actions';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Set up your CodePulse profile to start tracking your coding journey.',
};

/**
 * Onboarding page — server component.
 * Redirects already-onboarded users to dashboard.
 */
export default async function OnboardingPage() {
  const session = await auth();

  // If not authenticated, middleware will redirect — this is a safety net
  if (!session?.user) redirect('/login');

  // If already onboarded, skip straight to dashboard
  if (session.user.onboardingComplete) redirect('/dashboard');

  const branches = await getBranches();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <svg className="h-6 w-6 text-primary-foreground" viewBox="0 0 40 40" fill="none">
              <rect x="2" y="20" width="6" height="18" rx="1" fill="currentColor" fillOpacity="0.6"/>
              <rect x="11" y="12" width="6" height="26" rx="1" fill="currentColor" fillOpacity="0.8"/>
              <rect x="20" y="6" width="6" height="32" rx="1" fill="currentColor"/>
              <rect x="29" y="14" width="6" height="24" rx="1" fill="currentColor" fillOpacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We need a few details to set up your CodePulse account.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {['Account', 'Profile', 'Connect'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i === 1
                    ? 'bg-primary text-primary-foreground'
                    : i === 0
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i === 0 ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === 1 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
              {i < 2 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <OnboardingForm
            branches={branches}
            userEmail={session.user.email ?? ''}
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Signed in as{' '}
          <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
      </div>
    </main>
  );
}
