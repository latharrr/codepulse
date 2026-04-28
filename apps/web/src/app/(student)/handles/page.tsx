'use client';

import { useState, useEffect } from 'react';
import { linkHandle } from './actions';
import { Platform } from '@codepulse/types';

export default function HandlesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [existingHandles, setExistingHandles] = useState<any[]>([]);

  // Fetch handles on mount
  useEffect(() => {
    fetch('/api/student/handles')
      .then(res => res.json())
      .then(data => setExistingHandles(data))
      .catch(err => console.error('Failed to fetch handles:', err));
  }, []);

  const handleConnect = async (platform: Platform, handle?: string) => {
    const h = handle || handles[platform];
    if (!h) return;

    setLoading(platform);
    try {
      await linkHandle(platform, h);
      alert(`${platform} sync triggered for ${h}!`);
      // Refresh list
      const res = await fetch('/api/student/handles');
      const data = await res.json();
      setExistingHandles(data);
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const platforms = [
    { id: 'GITHUB' as Platform, label: 'GitHub', icon: '🐙', color: 'bg-green-50 text-green-700' },
    { id: 'CODEFORCES' as Platform, label: 'Codeforces', icon: '⚡', color: 'bg-blue-50 text-blue-700' },
    { id: 'LEETCODE' as Platform, label: 'LeetCode', icon: '💡', color: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
             <span className="font-bold text-xl tracking-tight">CodePulse</span>
          </div>
          <nav className="flex gap-4">
            <a href="/dashboard" className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity">Dashboard</a>
            <a href="/handles" className="text-sm font-medium border-b-2 border-primary">Handles</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Platform Handles</h1>
          <p className="text-muted-foreground mt-2">Link your coding profiles to aggregate your stats and compute your CodePulse score.</p>
        </div>

        <div className="grid gap-6">
          {platforms.map(p => {
            const existing = existingHandles.find(h => h.platform === p.id);
            return (
              <div key={p.id} className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20 overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/30 text-3xl transition-transform group-hover:scale-110">
                      {p.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{p.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {existing ? `Linked to @${existing.handle}` : `Not linked yet`}
                      </p>
                    </div>
                  </div>
                  {existing && (
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${p.color}`}>
                      {existing.verificationState}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  {!existing ? (
                    <>
                      <input
                        type="text"
                        placeholder={`Your ${p.label} handle`}
                        value={handles[p.id] || ''}
                        onChange={(e) => setHandles({ ...handles, [p.id]: e.target.value })}
                        className="flex-1 rounded-xl border border-input bg-background/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleConnect(p.id)}
                        disabled={loading === p.id || !handles[p.id]}
                        className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                      >
                        {loading === p.id ? 'Connecting...' : 'Connect'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.id, existing.handle)}
                      disabled={loading === p.id}
                      className="flex-1 rounded-xl bg-accent px-6 py-2 text-sm font-bold text-accent-foreground hover:bg-accent/80 disabled:opacity-50 transition-all active:scale-95 border border-border/50"
                    >
                      {loading === p.id ? 'Syncing...' : 'Sync Now'}
                    </button>
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

