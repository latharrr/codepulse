'use client';

/**
 * Root error boundary — catches uncaught exceptions in any route segment
 * that doesn't have its own error.tsx. Without this, a Prisma timeout or
 * unexpected exception renders Next.js's bare-bones default error page.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error] uncaught:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0B] px-6 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/70 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          A request failed unexpectedly. You can retry, or head back to the
          dashboard.
        </p>
        {error?.digest && (
          <p className="mt-4 break-all rounded-md bg-black/40 px-3 py-2 text-[10px] font-mono text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
