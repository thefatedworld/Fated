'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

interface PlatformSnapshot {
  date: string;
  newUsers: number;
  totalViews: number;
  totalWatchMinutes: string;
  tokensSold: string;
  unlocks: number;
}

const STAT_CARDS = [
  { key: 'views', label: 'Total Views', icon: '▶', color: 'purple' },
  { key: 'users', label: 'New Users', icon: '◎', color: 'blue' },
  { key: 'tokens', label: 'Tokens Sold', icon: '⬡', color: 'amber' },
  { key: 'unlocks', label: 'Unlocks', icon: '↗', color: 'green' },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<PlatformSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    adminApi.getPlatformSnapshot(token, 7)
      .then((data) => setSnapshots(data as PlatformSnapshot[]))
      .catch((err) => {
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          router.push('/login');
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const totals = snapshots.reduce(
    (acc, s) => ({
      views: acc.views + s.totalViews,
      users: acc.users + s.newUsers,
      tokens: acc.tokens + Number(s.tokensSold || 0),
      unlocks: acc.unlocks + s.unlocks,
    }),
    { views: 0, users: 0, tokens: 0, unlocks: 0 },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview — last 7 days</p>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          const value = totals[card.key];
          const colorMap = {
            purple: 'bg-purple-600/10 text-purple-400 border-purple-500/10',
            blue: 'bg-blue-600/10 text-blue-400 border-blue-500/10',
            amber: 'bg-amber-600/10 text-amber-400 border-amber-500/10',
            green: 'bg-green-600/10 text-green-400 border-green-500/10',
          };
          return (
            <div key={card.key} className={`rounded-xl p-5 border ${colorMap[card.color]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions + status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a
              href="/dashboard/series/new"
              className="flex items-center gap-3 w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <span>+</span>
              Create New Series
            </a>
            <a
              href="/dashboard/moderation"
              className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800/70 hover:bg-gray-800 rounded-lg text-sm font-medium text-gray-300 transition-colors"
            >
              <span>⛨</span>
              Moderation Queue
            </a>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            {[
              { label: 'API', status: 'Operational', ok: true },
              { label: 'Database', status: 'Connected', ok: true },
              { label: 'Environment', status: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'staging', ok: null },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className={row.ok === true ? 'text-green-400' : row.ok === false ? 'text-red-400' : 'text-yellow-400'}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {snapshots.length === 0 && !error && (
        <div className="mt-8 bg-gray-900/30 border border-gray-800/40 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No analytics data yet. Data appears after the first day of activity.</p>
        </div>
      )}
    </div>
  );
}
