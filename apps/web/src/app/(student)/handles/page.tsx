'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Code2, Github, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { linkHandle, syncHandle } from './actions';
import type { Platform } from '@codepulse/types';

type ExistingHandle = {
  id: string;
  platform: Platform;
  handle: string;
  verificationState: string;
  status: string;
  verificationToken?: string | null;
  lastFetchedAt?: string | null;
};

type Notice = { tone: 'success' | 'error'; text: string } | null;

const platforms = [
  {
    id: 'GITHUB' as Platform,
    label: 'GitHub',
    Icon: Github,
    hint: 'Add the token to your GitHub bio.',
  },
  {
    id: 'CODEFORCES' as Platform,
    label: 'Codeforces',
    Icon: Zap,
    hint: 'Temporarily set the token as your Codeforces first name.',
  },
  {
    id: 'LEETCODE' as Platform,
    label: 'LeetCode',
    Icon: Code2,
    hint: 'Add the token to your LeetCode About Me section.',
  },
];

export default function HandlesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [existingHandles, setExistingHandles] = useState<ExistingHandle[]>([]);
  const [notice, setNotice] = useState<Notice>(null);

  const loadExistingHandles = useCallback(async () => {
    const response = await fetch('/api/student/handles');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? 'Failed to fetch handles');
    }

    setExistingHandles(data);
  }, []);

  useEffect(() => {
    loadExistingHandles().catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch handles',
      });
    });
  }, [loadExistingHandles]);

  const handlesByPlatform = useMemo(() => {
    return new Map(existingHandles.map((handle) => [handle.platform, handle]));
  }, [existingHandles]);

  const handleConnect = async (platform: Platform) => {
    const handle = handles[platform]?.trim();
    if (!handle) return;

    setLoading(platform);
    setNotice(null);

    try {
      const result = await linkHandle(platform, handle);
      if (!result.ok) {
        setNotice({ tone: 'error', text: result.error });
        return;
      }

      setNotice({ tone: 'success', text: result.message });
      setHandles((current) => ({ ...current, [platform]: '' }));
      await loadExistingHandles();
    } finally {
      setLoading(null);
    }
  };

  const handleSync = async (handleId: string) => {
    setLoading(handleId);
    setNotice(null);

    try {
      const result = await syncHandle(handleId);
      if (!result.ok) {
        setNotice({ tone: 'error', text: result.error });
        return;
      }

      setNotice({ tone: 'success', text: result.message });
      await loadExistingHandles();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] font-sans text-slate-200 selection:bg-blue-500/30">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0A0A0B]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">CodePulse</span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </a>
            <a
              href="/handles"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Handles
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Platform Handles
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Link your coding profiles to aggregate stats and compute your CodePulse score.
          </p>
        </div>

        {notice && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.tone === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/20 bg-red-500/10 text-red-300'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid gap-6">
          {platforms.map(({ id, label, Icon, hint }) => {
            const existing = handlesByPlatform.get(id);
            const isVerified = existing?.verificationState === 'VERIFIED';
            const isBusy = loading === id || loading === existing?.id;

            return (
              <div
                key={id}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900 p-8 shadow-xl transition-all hover:border-white/10 hover:shadow-2xl"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 shadow-inner transition-transform group-hover:scale-105">
                      <Icon className="h-8 w-8 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{label}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-400">
                        {existing ? (
                          <span className="text-slate-300">
                            Linked to{' '}
                            <span className="text-white">@{existing.handle}</span>
                          </span>
                        ) : (
                          'Not linked yet'
                        )}
                      </p>
                    </div>
                  </div>

                  {existing && (
                    <span
                      className={`w-fit rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                        existing.status === 'DEAD'
                          ? 'bg-red-500/10 text-red-400'
                          : isVerified
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : existing.verificationState === 'FLAGGED'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {existing.status === 'DEAD' ? 'DEAD' : existing.verificationState}
                    </span>
                  )}
                </div>

                {existing && !isVerified && existing.verificationToken && (
                  <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-300">
                      <ShieldCheck className="h-4 w-4" />
                      Verification Required
                    </p>
                    <p className="mb-3 text-xs text-amber-400/80">{hint}</p>
                    <code className="inline-flex rounded border border-amber-500/30 bg-black/40 px-2.5 py-1 font-mono text-sm text-amber-200">
                      {existing.verificationToken}
                    </code>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {!existing ? (
                    <>
                      <input
                        type="text"
                        placeholder={`Your ${label} handle`}
                        value={handles[id] || ''}
                        onChange={(event) =>
                          setHandles({ ...handles, [id]: event.target.value })
                        }
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                      />
                      <button
                        onClick={() => handleConnect(id)}
                        disabled={isBusy || !handles[id]?.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {isBusy ? 'Connecting...' : 'Connect'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSync(existing.id)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/10 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
                      {isBusy
                        ? 'Queuing...'
                        : isVerified
                          ? 'Sync Data Now'
                          : 'Check Verification'}
                    </button>
                  )}

                  {existing?.lastFetchedAt && (
                    <p className="text-xs text-slate-500">
                      Last fetched {new Date(existing.lastFetchedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
