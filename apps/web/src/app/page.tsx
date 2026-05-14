import Link from 'next/link';

/**
 * Root page — redirects authenticated users to dashboard,
 * unauthenticated users to login.
 * In production this would be a marketing landing page.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-navy via-brand-accent to-blue-600 p-8">
      <div className="text-center text-white animate-fade-in">
        {/* Logo mark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 shadow-2xl">
          <svg
            className="h-10 w-10"
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

        <h1 className="mb-2 text-4xl font-bold tracking-tight sm:text-5xl">CodePulse</h1>
        <p className="mb-1 text-lg text-white/70 font-medium">
          Coding Intelligence Platform
        </p>
        <p className="mb-8 text-sm text-white/50">
          Aggregating GitHub · Codeforces · LeetCode into one unified profile
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {/* Single CTA — middleware routes authenticated admins to /admin and
              students to /dashboard, so we don't need a separate Admin link
              on the public landing page (which previously looked like a
              discovery surface for the admin console). */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-lg transition-all hover:bg-white/90 hover:shadow-xl hover:-translate-y-0.5"
          >
            Sign in to CodePulse
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>
    </main>
  );
}
