'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, type Series } from '@/lib/api-client';
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

function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  const barColor = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  }[color] ?? 'bg-purple-500';

  return (
    <div className="flex items-end gap-1 h-12 mt-3">
      {data.map((val, i) => {
        const height = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t ${barColor} opacity-80 transition-all`}
            style={{ height: `${height}%` }}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<PlatformSnapshot[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    loadData();
  }, [daysRange]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setLoading(true);

    try {
      const [data, series] = await Promise.all([
        adminApi.getPlatformSnapshot(token, daysRange),
        adminApi.listSeries(token),
      ]);
      setSnapshots(data as PlatformSnapshot[]);
      setSeriesList(series);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        router.push('/login');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  }

  const totals = snapshots.reduce(
    (acc, s) => ({
      views: acc.views + s.totalViews,
      users: acc.users + s.newUsers,
      tokens: acc.tokens + Number(s.tokensSold || 0),
      unlocks: acc.unlocks + s.unlocks,
    }),
    { views: 0, users: 0, tokens: 0, unlocks: 0 },
  );

  const dailyViews = snapshots.map((s) => s.totalViews);
  const dailyUsers = snapshots.map((s) => s.newUsers);
  const dailyTokens = snapshots.map((s) => Number(s.tokensSold || 0));
  const dailyUnlocks = snapshots.map((s) => s.unlocks);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview — last {daysRange} days</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                daysRange === d
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stat cards with mini charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          const value = totals[card.key];
          const daily = { views: dailyViews, users: dailyUsers, tokens: dailyTokens, unlocks: dailyUnlocks }[card.key];
          const maxVal = Math.max(...(daily || [0]));
          const colorMap = {
            purple: 'bg-purple-600/10 text-purple-400 border-purple-500/10',
            blue: 'bg-blue-600/10 text-blue-400 border-blue-500/10',
            amber: 'bg-amber-600/10 text-amber-400 border-amber-500/10',
            green: 'bg-green-600/10 text-green-400 border-green-500/10',
          };
          return (
            <div key={card.key} className={`rounded-xl p-5 border ${colorMap[card.color]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              {daily && daily.length > 1 && (
                <MiniBarChart data={daily} maxVal={maxVal} color={card.color} />
              )}
            </div>
          );
        })}
      </div>

      {/* Daily breakdown table */}
      {snapshots.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-800/60">
            <h3 className="text-sm font-semibold text-white">Daily Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="text-left text-gray-500 font-medium px-5 py-2.5 text-xs">Date</th>
                <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Views</th>
                <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">New Users</th>
                <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Tokens Sold</th>
                <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Unlocks</th>
                <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Watch Time</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.date} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                  <td className="px-5 py-2.5 text-gray-300">
                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5 text-right text-white font-medium">{s.totalViews.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-blue-400">{s.newUsers.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-amber-400">{Number(s.tokensSold || 0).toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-green-400">{s.unlocks.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400">{Number(s.totalWatchMinutes || 0).toLocaleString()}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Series overview */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Series Overview</h3>
          {seriesList.length === 0 ? (
            <p className="text-gray-500 text-sm">No series yet.</p>
          ) : (
            <div className="space-y-3">
              {seriesList.slice(0, 8).map((s) => (
                <a
                  key={s.id}
                  href={`/dashboard/series/${s.id}`}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-400 text-xs font-bold">
                        {s.title[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                        {s.title}
                      </p>
                      <div className="flex gap-1.5 mt-0.5">
                        {s.genreTags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] text-gray-500">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    s.status === 'published'
                      ? 'bg-green-600/10 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {s.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + status */}
        <div className="space-y-4">
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
              <a
                href="/dashboard/distribution"
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800/70 hover:bg-gray-800 rounded-lg text-sm font-medium text-gray-300 transition-colors"
              >
                <span>↗</span>
                Distribution Jobs
              </a>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-3">
              {[
                { label: 'API', status: 'Operational', ok: true },
                { label: 'Database', status: 'Connected', ok: true },
                { label: 'Series', status: `${seriesList.length} active`, ok: null },
                { label: 'Environment', status: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development', ok: null },
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
      </div>

      {/* Empty state */}
      {snapshots.length === 0 && !error && (
        <div className="bg-gray-900/30 border border-gray-800/40 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No analytics data yet. Data appears after the first day of activity.</p>
        </div>
      )}
    </div>
  );
}
