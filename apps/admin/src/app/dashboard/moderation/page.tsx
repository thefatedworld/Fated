'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';

interface QueueItem {
  id: string;
  status: string;
  category?: string;
  createdAt: string;
  reporter?: { username: string };
  page?: { title: string; slug: string };
  author?: { username: string };
}

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<QueueItem[]>([]);
  const [wikiQueue, setWikiQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'wiki'>('reports');

  useEffect(() => {
    const token = localStorage.getItem('fated_access_token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      adminApi.getModerationQueue(token, 'reports'),
      adminApi.getModerationQueue(token, 'wiki'),
    ])
      .then(([r, w]) => {
        setReports(r as QueueItem[]);
        setWikiQueue(w as QueueItem[]);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/dashboard/series" className="hover:text-white">Series</a>
          <a href="/dashboard/moderation" className="text-white">Moderation</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Moderation Queue</h2>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Abuse Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('wiki')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'wiki' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Wiki Reviews ({wikiQueue.length})
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {activeTab === 'reports' && (
              reports.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No open reports.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Reporter</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Category</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4 text-sm">{r.reporter?.username ?? 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{r.category}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs bg-yellow-900/50 text-yellow-400">{r.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'wiki' && (
              wikiQueue.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No pending wiki revisions.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Page</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Author</th>
                      <th className="px-6 py-3 text-xs text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {wikiQueue.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4 text-sm">{r.page?.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{r.author?.username}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
