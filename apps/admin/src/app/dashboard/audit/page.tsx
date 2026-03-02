'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AuditLogEntry } from '@/lib/api-client';

export default function AuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ action: '', actorId: '', targetType: '' });

  function getToken() {
    return localStorage.getItem('fated_access_token') ?? '';
  }

  async function load(append = false) {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const params: Record<string, string> = { limit: '50' };
      if (filters.action) params.action = filters.action;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.targetType) params.targetType = filters.targetType;
      if (append && cursor) params.cursor = cursor;

      const data = await adminApi.getAuditLog(token, params);
      if (append) {
        setEntries((prev) => [...prev, ...data]);
      } else {
        setEntries(data);
      }
      setHasMore(data.length === 50);
      if (data.length > 0) setCursor(data[data.length - 1].id);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setCursor(undefined);
    setEntries([]);
    load();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  function actionBadgeColor(action: string) {
    if (action.startsWith('token.')) return 'text-yellow-400';
    if (action.startsWith('user.ban') || action.startsWith('moderation.')) return 'text-red-400';
    if (action.startsWith('episode.publish') || action.startsWith('series.publish')) return 'text-green-400';
    if (action.startsWith('wiki.')) return 'text-blue-400';
    return 'text-gray-300';
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/dashboard/series" className="hover:text-white">Series</a>
          <a href="/dashboard/users" className="hover:text-white">Users</a>
          <a href="/dashboard/moderation" className="hover:text-white">Moderation</a>
          <a href="/dashboard/audit" className="text-white">Audit Log</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="Filter by action (e.g. token.credit)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <input
            value={filters.actorId}
            onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
            placeholder="Actor ID (UUID)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <select
            value={filters.targetType}
            onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All target types</option>
            <option value="user">User</option>
            <option value="episode">Episode</option>
            <option value="series">Series</option>
            <option value="token">Token</option>
            <option value="wiki">Wiki</option>
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {entries.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No audit log entries found.</div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Time</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Action</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Actor</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Target</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-mono ${actionBadgeColor(entry.action)}`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">
                          <span className="font-mono">{entry.actorId?.slice(0, 8)}…</span>
                          {entry.actorRole && (
                            <span className="ml-1 text-gray-500">({entry.actorRole})</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">
                          {entry.targetType && (
                            <span className="font-mono">
                              {entry.targetType}:{entry.targetId?.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500">
                          {entry.ipAddress ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {hasMore && (
                  <div className="px-6 py-4 border-t border-gray-800">
                    <button
                      onClick={() => load(true)}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
