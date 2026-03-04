'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, type Series, type CommunityStats, type TrendingSeries } from '@/lib/api-client';
import { getToken } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PlatformSnapshot {
  date: string;
  newUsers: number;
  totalViews: number;
  totalWatchMinutes: string;
  tokensSold: string;
  unlocks: number;
}

type MetricKey = 'views' | 'users' | 'tokens' | 'unlocks' | 'watchMinutes'
  | 'threads' | 'replies' | 'votes' | 'wikiEdits';

interface ModalMetric {
  key: MetricKey;
  label: string;
  color: string;
  stroke: string;
  suffix?: string;
}

const MODAL_RANGES = [
  { label: '1d', days: 1 },
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: 'All', days: 3650 },
] as const;

const METRIC_CONFIG: Record<MetricKey, { stroke: string; gradientId: string }> = {
  views: { stroke: '#a855f7', gradientId: 'gModal' },
  users: { stroke: '#3b82f6', gradientId: 'gModal' },
  tokens: { stroke: '#f59e0b', gradientId: 'gModal' },
  unlocks: { stroke: '#22c55e', gradientId: 'gModal' },
  watchMinutes: { stroke: '#14b8a6', gradientId: 'gModal' },
  threads: { stroke: '#f43f5e', gradientId: 'gModal' },
  replies: { stroke: '#06b6d4', gradientId: 'gModal' },
  votes: { stroke: '#f97316', gradientId: 'gModal' },
  wikiEdits: { stroke: '#6366f1', gradientId: 'gModal' },
};

function extractMetricValue(snapshot: PlatformSnapshot, key: MetricKey): number {
  switch (key) {
    case 'views': return snapshot.totalViews;
    case 'users': return snapshot.newUsers;
    case 'tokens': return Number(snapshot.tokensSold || 0);
    case 'unlocks': return snapshot.unlocks;
    case 'watchMinutes': return Number(snapshot.totalWatchMinutes || 0);
    default: return 0;
  }
}

const COMMUNITY_KEYS = new Set<MetricKey>(['threads', 'replies', 'votes', 'wikiEdits']);

function MetricModal({
  metric,
  onClose,
}: {
  metric: ModalMetric;
  onClose: () => void;
}) {
  const [days, setDays] = useState(30);
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadModalData = useCallback(async (d: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (COMMUNITY_KEYS.has(metric.key)) {
        const cs = await adminApi.getCommunityStats(token, d);
        const daily: { date: string; value: number }[] = (cs.dailyCommunity ?? []).map(
          (row: Record<string, unknown>) => ({
            date: String(row.date),
            value: Number(row[metric.key] ?? 0),
          }),
        );
        setChartData(daily.reverse());
        setTotal(daily.reduce((a, r) => a + r.value, 0));
      } else {
        const snaps = (await adminApi.getPlatformSnapshot(token, d)) as PlatformSnapshot[];
        const mapped = [...snaps].reverse().map((s) => ({
          date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: extractMetricValue(s, metric.key),
        }));
        setChartData(mapped);
        setTotal(mapped.reduce((a, r) => a + r.value, 0));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [metric.key]);

  useEffect(() => { loadModalData(days); }, [days, loadModalData]);

  const cfg = METRIC_CONFIG[metric.key];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{metric.label}</h2>
            <p className="text-2xl font-bold mt-1" style={{ color: cfg.stroke }}>
              {total.toLocaleString()}{metric.suffix ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {MODAL_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setDays(r.days)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  days === r.days
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none ml-3"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            No data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gModal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.stroke} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={cfg.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [
                  `${value.toLocaleString()}${metric.suffix ?? ''}`,
                  metric.label,
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={cfg.stroke}
                fill="url(#gModal)"
                strokeWidth={2}
                name={metric.label}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {!loading && chartData.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 font-medium py-1.5 px-2">Date</th>
                  <th className="text-right text-gray-500 font-medium py-1.5 px-2">{metric.label}</th>
                </tr>
              </thead>
              <tbody>
                {[...chartData].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-gray-800/40">
                    <td className="text-gray-400 py-1 px-2">{d.date}</td>
                    <td className="text-right font-medium py-1 px-2" style={{ color: cfg.stroke }}>
                      {d.value.toLocaleString()}{metric.suffix ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  const barColor = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
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

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  if (prior === 0 && current === 0) return null;
  const pct = prior === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return <span className="text-[10px] text-gray-500 ml-1">--</span>;
  const isUp = pct > 0;
  return (
    <span className={`text-[10px] font-medium ml-2 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function SparkBar({ value, maxVal }: { value: number; maxVal: number }) {
  const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, 2) : 2;
  return (
    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<PlatformSnapshot[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [trendingSeries, setTrendingSeries] = useState<TrendingSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysRange, setDaysRange] = useState(7);
  const [selectedMetric, setSelectedMetric] = useState<ModalMetric | null>(null);

  useEffect(() => {
    loadData();
  }, [daysRange]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setLoading(true);

    try {
      const [data, series, community, trending] = await Promise.all([
        adminApi.getPlatformSnapshot(token, daysRange),
        adminApi.listSeries(token),
        adminApi.getCommunityStats(token, daysRange).catch(() => null),
        adminApi.getTrendingSeries(token, daysRange).catch(() => []),
      ]);
      setSnapshots(data as PlatformSnapshot[]);
      setSeriesList(series);
      setCommunityStats(community);
      setTrendingSeries(trending);
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
      watchMinutes: acc.watchMinutes + Number(s.totalWatchMinutes || 0),
    }),
    { views: 0, users: 0, tokens: 0, unlocks: 0, watchMinutes: 0 },
  );

  const halfIdx = Math.floor(snapshots.length / 2);
  const priorHalf = snapshots.slice(halfIdx);
  const recentHalf = snapshots.slice(0, halfIdx || snapshots.length);
  const sum = (arr: PlatformSnapshot[], fn: (s: PlatformSnapshot) => number) => arr.reduce((a, s) => a + fn(s), 0);
  const priorTotals = {
    views: sum(priorHalf, (s) => s.totalViews),
    users: sum(priorHalf, (s) => s.newUsers),
    tokens: sum(priorHalf, (s) => Number(s.tokensSold || 0)),
    unlocks: sum(priorHalf, (s) => s.unlocks),
    watchMinutes: sum(priorHalf, (s) => Number(s.totalWatchMinutes || 0)),
  };
  const recentTotals = {
    views: sum(recentHalf, (s) => s.totalViews),
    users: sum(recentHalf, (s) => s.newUsers),
    tokens: sum(recentHalf, (s) => Number(s.tokensSold || 0)),
    unlocks: sum(recentHalf, (s) => s.unlocks),
    watchMinutes: sum(recentHalf, (s) => Number(s.totalWatchMinutes || 0)),
  };

  const dailyViews = snapshots.map((s) => s.totalViews);
  const dailyUsers = snapshots.map((s) => s.newUsers);
  const dailyTokens = snapshots.map((s) => Number(s.tokensSold || 0));
  const dailyUnlocks = snapshots.map((s) => s.unlocks);
  const dailyWatch = snapshots.map((s) => Number(s.totalWatchMinutes || 0));

  const STAT_CARDS = [
    { key: 'views' as const, label: 'Total Views', icon: '▶', color: 'purple', value: totals.views, prior: priorTotals.views, recent: recentTotals.views, daily: dailyViews },
    { key: 'users' as const, label: 'New Users', icon: '◎', color: 'blue', value: totals.users, prior: priorTotals.users, recent: recentTotals.users, daily: dailyUsers },
    { key: 'tokens' as const, label: 'Tokens Sold', icon: '⬡', color: 'amber', value: totals.tokens, prior: priorTotals.tokens, recent: recentTotals.tokens, daily: dailyTokens },
    { key: 'unlocks' as const, label: 'Unlocks', icon: '↗', color: 'green', value: totals.unlocks, prior: priorTotals.unlocks, recent: recentTotals.unlocks, daily: dailyUnlocks },
    { key: 'watchMinutes' as const, label: 'Watch Time', icon: '⏱', color: 'teal', value: totals.watchMinutes, prior: priorTotals.watchMinutes, recent: recentTotals.watchMinutes, daily: dailyWatch, suffix: 'm' },
  ];

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-600/10 text-purple-400 border-purple-500/10',
    blue: 'bg-blue-600/10 text-blue-400 border-blue-500/10',
    amber: 'bg-amber-600/10 text-amber-400 border-amber-500/10',
    green: 'bg-green-600/10 text-green-400 border-green-500/10',
    teal: 'bg-teal-600/10 text-teal-400 border-teal-500/10',
    rose: 'bg-rose-600/10 text-rose-400 border-rose-500/10',
    cyan: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/10',
    orange: 'bg-orange-600/10 text-orange-400 border-orange-500/10',
    indigo: 'bg-indigo-600/10 text-indigo-400 border-indigo-500/10',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cs = communityStats;
  const communityCards: { key: MetricKey; label: string; icon: string; color: string; value: number; prior: number }[] = cs ? [
    { key: 'threads', label: 'Threads Created', icon: '💬', color: 'rose', value: cs.community.threadsCreated, prior: cs.community.threadsCreatedPrior },
    { key: 'replies', label: 'Replies Posted', icon: '↩', color: 'cyan', value: cs.community.repliesPosted, prior: cs.community.repliesPostedPrior },
    { key: 'votes', label: 'Community Votes', icon: '⬆', color: 'orange', value: cs.community.communityVotes, prior: cs.community.communityVotesPrior },
    { key: 'wikiEdits', label: 'Wiki Edits', icon: '📝', color: 'indigo', value: cs.community.wikiEditsSubmitted, prior: cs.community.wikiEditsSubmittedPrior },
  ] : [];

  const maxTrendingViews = Math.max(...trendingSeries.map((s) => s.views), 1);

  return (
    <div>
      {/* Header */}
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

      {/* Platform KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          const maxVal = Math.max(...(card.daily || [0]));
          return (
            <div
              key={card.key}
              className={`rounded-xl p-5 border cursor-pointer hover:scale-[1.02] transition-transform ${colorMap[card.color]}`}
              onClick={() =>
                setSelectedMetric({
                  key: card.key,
                  label: card.label,
                  color: card.color,
                  stroke: METRIC_CONFIG[card.key].stroke,
                  suffix: 'suffix' in card ? (card as { suffix?: string }).suffix : undefined,
                })
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold">{card.value.toLocaleString()}{'suffix' in card ? card.suffix : ''}</p>
                <DeltaBadge current={card.recent} prior={card.prior} />
              </div>
              {card.daily && card.daily.length > 1 && (
                <MiniBarChart data={card.daily} maxVal={maxVal} color={card.color} />
              )}
            </div>
          );
        })}
      </div>

      {/* Community Engagement cards */}
      {communityCards.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Community Engagement</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {communityCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-xl p-5 border cursor-pointer hover:scale-[1.02] transition-transform ${colorMap[card.color]}`}
                onClick={() =>
                  setSelectedMetric({
                    key: card.key,
                    label: card.label,
                    color: card.color,
                    stroke: METRIC_CONFIG[card.key].stroke,
                  })
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                  <DeltaBadge current={card.value} prior={card.prior} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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

      {/* Trending Series + Top Community Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Trending Series */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Trending Series</h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Last {daysRange}d</span>
          </div>
          {trendingSeries.length === 0 ? (
            <p className="text-gray-500 text-sm">No trending data yet.</p>
          ) : (
            <div className="space-y-3">
              {trendingSeries.map((s, i) => (
                <a
                  key={s.seriesId}
                  href={`/dashboard/series/${s.seriesId}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-lg font-bold text-gray-600 w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                      {s.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-500">{s.views.toLocaleString()} views</span>
                      <span className="text-[10px] text-gray-500">{s.unlocks.toLocaleString()} unlocks</span>
                    </div>
                  </div>
                  <SparkBar value={s.views} maxVal={maxTrendingViews} />
                </a>
              ))}
            </div>
          )}
          {trendingSeries.length === 0 && seriesList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800/40">
              <p className="text-[11px] text-gray-600">Showing all series as fallback:</p>
              <div className="space-y-2 mt-2">
                {seriesList.slice(0, 5).map((s) => (
                  <a key={s.id} href={`/dashboard/series/${s.id}`} className="flex items-center gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-400 text-[10px] font-bold">{s.title[0]}</span>
                    </div>
                    <p className="text-sm text-gray-300 group-hover:text-purple-400 transition-colors truncate">{s.title}</p>
                    <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-medium ${
                      s.status === 'published' ? 'bg-green-600/10 text-green-400' : 'bg-gray-800 text-gray-400'
                    }`}>{s.status}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Community Posts */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Top Community Posts</h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">By votes</span>
          </div>
          {!cs || cs.topThreads.length === 0 ? (
            <p className="text-gray-500 text-sm">No community posts yet.</p>
          ) : (
            <div className="space-y-3">
              {cs.topThreads.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                    <span className="text-xs text-orange-400 font-bold">⬆ {t.voteCount}</span>
                    <span className="text-[10px] text-gray-600">{t.replyCount} replies</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.title}</p>
                    {t.seriesTitle && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{t.seriesTitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                    {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wiki Activity + Moderation Health + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Wiki / Lore Activity */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Wiki / Lore Activity</h3>
          {cs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Pages Created</span>
                <span className="text-white font-medium">{cs.wiki.pagesCreated}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Edits Approved</span>
                <span className="text-green-400 font-medium">{cs.wiki.editsApproved}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Edits Rejected</span>
                <span className="text-red-400 font-medium">{cs.wiki.editsRejected}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-gray-800/40 pt-3">
                <span className="text-gray-400">Pending Review</span>
                <a href="/dashboard/moderation" className="flex items-center gap-1.5">
                  <span className={`font-bold ${cs.wiki.editsPending > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {cs.wiki.editsPending}
                  </span>
                  {cs.wiki.editsPending > 0 && (
                    <span className="text-[10px] text-purple-400 hover:underline">Review →</span>
                  )}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No wiki data available.</p>
          )}
        </div>

        {/* Moderation Health */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Moderation Health</h3>
          {cs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Open Reports</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    cs.moderation.openReports === 0 ? 'bg-green-400' :
                    cs.moderation.openReports <= 3 ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white font-medium">{cs.moderation.openReports}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Under Review</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    cs.moderation.underReviewReports === 0 ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  <span className="text-white font-medium">{cs.moderation.underReviewReports}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Wiki Edits Pending</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    cs.wiki.editsPending === 0 ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  <span className="text-white font-medium">{cs.wiki.editsPending}</span>
                </div>
              </div>
              <div className="border-t border-gray-800/40 pt-3">
                <a
                  href="/dashboard/moderation"
                  className="flex items-center justify-center w-full px-4 py-2 bg-gray-800/70 hover:bg-gray-800 rounded-lg text-xs font-medium text-gray-300 transition-colors"
                >
                  Open Moderation Queue
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No moderation data.</p>
          )}
        </div>

        {/* Quick Actions */}
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
            <a
              href="/dashboard/users"
              className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800/70 hover:bg-gray-800 rounded-lg text-sm font-medium text-gray-300 transition-colors"
            >
              <span>◎</span>
              Manage Users
            </a>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {snapshots.length === 0 && !error && (
        <div className="bg-gray-900/30 border border-gray-800/40 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No analytics data yet. Data appears after the first day of activity.</p>
        </div>
      )}

      {selectedMetric && (
        <MetricModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
      )}
    </div>
  );
}
