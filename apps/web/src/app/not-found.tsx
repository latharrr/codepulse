import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0B] px-6 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/70 p-8 text-center shadow-xl">
        <p className="text-5xl font-black text-blue-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
