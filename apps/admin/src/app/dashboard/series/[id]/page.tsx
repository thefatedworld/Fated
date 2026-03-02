'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi, Series, Episode } from '@/lib/api-client';

export default function SeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<string | null>(null); // episodeId
  const [scheduleAt, setScheduleAt] = useState('');
  const [uploading, setUploading] = useState<string | null>(null); // episodeId
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadEpisodeId, setActiveUploadEpisodeId] = useState<string | null>(null);

  const [newEpisode, setNewEpisode] = useState({
    title: '',
    description: '',
    isGated: false,
    tokenCost: 0,
  });

  function getToken() {
    return localStorage.getItem('fated_access_token') ?? '';
  }

  async function load() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const [s, eps] = await Promise.all([
        adminApi.getSeries(token, id),
        adminApi.listEpisodes(token, id),
      ]);
      setSeries(s);
      setEpisodes(eps);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const ep = await adminApi.createEpisode(getToken(), id, newEpisode);
      setEpisodes((prev) => [...prev, ep]);
      setNewEpisode({ title: '', description: '', isGated: false, tokenCost: 0 });
      setShowCreateEpisode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode');
    }
  }

  async function handlePublishEpisode(episodeId: string) {
    try {
      const updated = await adminApi.publishEpisode(getToken(), episodeId);
      setEpisodes((prev) => prev.map((ep) => ep.id === episodeId ? updated : ep));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish episode');
    }
  }

  async function handleScheduleEpisode() {
    if (!scheduleModal || !scheduleAt) return;
    try {
      const updated = await adminApi.scheduleEpisode(getToken(), scheduleModal, new Date(scheduleAt).toISOString());
      setEpisodes((prev) => prev.map((ep) => ep.id === scheduleModal ? updated : ep));
      setScheduleModal(null);
      setScheduleAt('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule episode');
    }
  }

  async function handlePublishSeries() {
    if (!series) return;
    try {
      const updated = await adminApi.publishSeries(getToken(), series.id);
      setSeries(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish series');
    }
  }

  function handleUploadClick(episodeId: string) {
    setActiveUploadEpisodeId(episodeId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeUploadEpisodeId) return;
    e.target.value = '';

    setUploading(activeUploadEpisodeId);
    setUploadProgress(0);
    setError('');

    try {
      // 1. Get signed upload URL
      const { uploadUrl, assetId } = await adminApi.getUploadUrl(
        getToken(),
        activeUploadEpisodeId,
        file.type || 'video/mp4',
      );

      // 2. Upload directly to GCS
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.send(file);
      });

      // 3. Confirm upload
      await adminApi.confirmUpload(getToken(), assetId, file.size);
      setUploadProgress(100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      setActiveUploadEpisodeId(null);
    }
  }

  function statusBadge(status: string, isDeleted: boolean) {
    if (isDeleted) return <span className="px-2 py-1 rounded text-xs bg-red-900/50 text-red-400">deleted</span>;
    const colors: Record<string, string> = {
      published: 'bg-green-900/50 text-green-400',
      scheduled: 'bg-blue-900/50 text-blue-400',
      draft: 'bg-gray-700 text-gray-400',
      unpublished: 'bg-yellow-900/50 text-yellow-400',
      removed: 'bg-red-900/50 text-red-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[status] ?? 'bg-gray-700 text-gray-400'}`}>
        {status}
      </span>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/dashboard/series" className="text-white">Series</a>
          <a href="/dashboard/users" className="hover:text-white">Users</a>
          <a href="/dashboard/moderation" className="hover:text-white">Moderation</a>
          <a href="/dashboard/audit" className="hover:text-white">Audit Log</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back */}
        <a href="/dashboard/series" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to series
        </a>

        {/* Series header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">{series?.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              {series && statusBadge(series.status, series.isDeleted)}
              <span className="text-sm text-gray-400">{series?.slug}</span>
            </div>
            {series?.description && (
              <p className="text-sm text-gray-400 mt-2 max-w-2xl">{series.description}</p>
            )}
            {series?.genreTags?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {series.genreTags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-xs bg-purple-900/30 text-purple-300">{tag}</span>
                ))}
              </div>
            )}
          </div>
          {series?.status === 'draft' && (
            <button
              onClick={handlePublishSeries}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              Publish Series
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Episodes */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Episodes ({episodes.length})</h3>
          <button
            onClick={() => setShowCreateEpisode(!showCreateEpisode)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            {showCreateEpisode ? 'Cancel' : '+ Add Episode'}
          </button>
        </div>

        {/* Create episode form */}
        {showCreateEpisode && (
          <form onSubmit={handleCreateEpisode} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">New Episode</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Title *</label>
                <input
                  required
                  value={newEpisode.title}
                  onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Episode title"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={newEpisode.description}
                  onChange={(e) => setNewEpisode({ ...newEpisode, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Episode description"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEpisode.isGated}
                    onChange={(e) => setNewEpisode({ ...newEpisode, isGated: e.target.checked })}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span className="text-sm text-gray-300">Token-gated</span>
                </label>
              </div>
              {newEpisode.isGated && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Token Cost</label>
                  <input
                    type="number"
                    min={1}
                    value={newEpisode.tokenCost}
                    onChange={(e) => setNewEpisode({ ...newEpisode, tokenCost: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateEpisode(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Create Episode
              </button>
            </div>
          </form>
        )}

        {/* Episodes table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {episodes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No episodes yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">#</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">Title</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">Gated</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">Published</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {episodes.map((ep) => (
                  <tr key={ep.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-400">{ep.number}</td>
                    <td className="px-6 py-4 text-sm font-medium">{ep.title}</td>
                    <td className="px-6 py-4">{statusBadge(ep.status, ep.isDeleted)}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {ep.isGated ? `${ep.tokenCost} tokens` : 'Free'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {ep.publishedAt
                        ? new Date(ep.publishedAt).toLocaleDateString()
                        : ep.scheduledAt
                        ? `Scheduled ${new Date(ep.scheduledAt).toLocaleDateString()}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Upload video */}
                        <button
                          onClick={() => handleUploadClick(ep.id)}
                          disabled={uploading === ep.id}
                          className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
                        >
                          {uploading === ep.id ? `${uploadProgress}%` : 'Upload'}
                        </button>

                        {/* Publish (if draft/scheduled) */}
                        {(ep.status === 'draft' || ep.status === 'scheduled') && !ep.isDeleted && (
                          <button
                            onClick={() => handlePublishEpisode(ep.id)}
                            className="px-2 py-1 text-xs rounded bg-green-800 hover:bg-green-700 text-green-300 transition-colors"
                          >
                            Publish
                          </button>
                        )}

                        {/* Schedule */}
                        {ep.status === 'draft' && !ep.isDeleted && (
                          <button
                            onClick={() => { setScheduleModal(ep.id); setScheduleAt(''); }}
                            className="px-2 py-1 text-xs rounded bg-blue-900 hover:bg-blue-800 text-blue-300 transition-colors"
                          >
                            Schedule
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Schedule modal */}
        {scheduleModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-base font-semibold mb-4">Schedule Episode</h3>
              <label className="block text-xs text-gray-400 mb-1">Publish at</label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setScheduleModal(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleEpisode}
                  disabled={!scheduleAt}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
