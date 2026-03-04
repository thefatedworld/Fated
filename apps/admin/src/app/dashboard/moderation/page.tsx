'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

interface QueueItem {
  id: string;
  status: string;
  category?: string;
  createdAt: string;
  reporter?: { username: string };
  page?: { title: string; slug: string };
  author?: { username: string };
  body?: string;
}

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<QueueItem[]>([]);
  const [wikiQueue, setWikiQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'wiki'>('reports');
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
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

  async function handleApproveWiki(revisionId: string) {
    setError('');
    setActionInProgress(revisionId);
    try {
      await adminApi.approveWiki(getToken()!, revisionId);
      setWikiQueue((prev) => prev.filter((item) => item.id !== revisionId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve revision');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleRejectWiki() {
    if (!rejectModal) return;
    setError('');
    setActionInProgress(rejectModal);
    try {
      await adminApi.rejectWiki(getToken()!, rejectModal, rejectNote);
      setWikiQueue((prev) => prev.filter((item) => item.id !== rejectModal));
      setRejectModal(null);
      setRejectNote('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject revision');
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
        <p className="text-gray-500 text-sm mt-1">Review reports and wiki submissions</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['reports', 'wiki'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-purple-600/15 text-purple-400'
                : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'reports' ? `Abuse Reports (${reports.length})` : `Wiki Reviews (${wikiQueue.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden">
          {activeTab === 'reports' && (
            reports.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No open reports.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/60 text-left">
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Reporter</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Category</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4 text-sm text-white">{r.reporter?.username ?? 'Unknown'}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">{r.category}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-600/10 text-yellow-400 border border-yellow-500/10">{r.status}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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
                  <tr className="border-b border-gray-800/60 text-left">
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Page</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Author</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Date</th>
                    <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {wikiQueue.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4 text-sm text-white">{r.page?.title}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">{r.author?.username}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveWiki(r.id)}
                            disabled={actionInProgress === r.id}
                            className="px-2.5 py-1 text-xs rounded-md bg-green-600/10 hover:bg-green-600/20 text-green-400 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(r.id); setRejectNote(''); }}
                            disabled={actionInProgress === r.id}
                            className="px-2.5 py-1 text-xs rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {/* Reject Wiki modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4">Reject Wiki Revision</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Review Note</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="Reason for rejection..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRejectWiki}
                disabled={!rejectNote.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
