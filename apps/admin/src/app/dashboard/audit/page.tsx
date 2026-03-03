'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AuditLogEntry } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

export default function AuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ action: '', actorId: '', targetType: '' });

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Track all administrative actions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          placeholder="Filter by action"
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
        <input
          value={filters.actorId}
          onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
          placeholder="Actor ID"
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
        <select
          value={filters.targetType}
          onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        >
          <option value="">All targets</option>
          <option value="user">User</option>
          <option value="episode">Episode</option>
          <option value="series">Series</option>
          <option value="token">Token</option>
          <option value="wiki">Wiki</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No audit log entries found.</div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/60 text-left">
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Time</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Action</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actor</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Target</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-mono ${actionBadgeColor(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        <span className="font-mono">{entry.actorId?.slice(0, 8)}...</span>
                        {entry.actorRole && (
                          <span className="ml-1 text-gray-500">({entry.actorRole})</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {entry.targetType && (
                          <span className="font-mono">
                            {entry.targetType}:{entry.targetId?.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {entry.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {hasMore && (
                <div className="px-5 py-4 border-t border-gray-800/60">
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
    </div>
  );
}
