import type { Metadata } from 'next';
import { signIn } from '@/auth';

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
                Sign in with any Google account to continue
              </p>
            </div>
          </div>

          {/* Real Google Sign-in */}
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/dashboard' });
            }}
          >
            <button
              id="btn-google-signin"
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              {/* Google SVG */}
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Dev Bypass Sign-in */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 border-t border-white/20 pt-6">
              <p className="mb-4 text-center text-xs font-semibold text-white/50 uppercase tracking-wider">
                Development Only
              </p>
              <form
                action={async (formData) => {
                  'use server';
                  const email = formData.get('email') as string;
                  await signIn('credentials', { email, redirectTo: '/dashboard' });
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="dev@lpu.ac.in"
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 ring-1 ring-white/20 focus:outline-none focus:ring-white/50"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
                >
                  Bypass
                </button>
              </form>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-white/40">
            Personal Gmail and organization Google accounts are supported.
            <br />
            Admin access is granted automatically for approved emails.
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
