'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi, Series, Episode, Season, UpdateEpisodeInput } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

interface SeriesAnalytics {
  seriesId: string;
  period: string;
  dailySnapshots: {
    date: string;
    views: number;
    watchMinutes: string;
    tokensSold: string;
    unlocks: number;
    completionRate: number | null;
  }[];
  totals: {
    views: number;
    watchMinutes: string;
    tokensSold: string;
    unlocks: number;
  };
}

export default function SeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [analytics, setAnalytics] = useState<SeriesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadEpisodeId, setActiveUploadEpisodeId] = useState<string | null>(null);

  // Episode edit state
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editEpisodeData, setEditEpisodeData] = useState<UpdateEpisodeInput>({});

  // Series edit state
  const [showEditSeries, setShowEditSeries] = useState(false);
  const [editSeriesData, setEditSeriesData] = useState({
    title: '',
    description: '',
    genreTags: '',
    coverImageUrl: '',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'series' | 'episode'; id: string; title: string } | null>(null);

  // Seasons state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [newSeason, setNewSeason] = useState({ title: '', number: 1, arcLabel: '' });

  const [newEpisode, setNewEpisode] = useState({
    title: '',
    description: '',
    isGated: false,
    tokenCost: 0,
  });

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
      try {
        const seasonsData = await adminApi.listSeasons(token, id);
        setSeasons(seasonsData);
      } catch { /* seasons endpoint may not exist yet */ }
      try {
        const analyticsData = await adminApi.getSeriesAnalytics(token, id) as SeriesAnalytics;
        setAnalytics(analyticsData);
      } catch { /* analytics may not be available */ }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const season = await adminApi.createSeason(getToken()!, id, {
        title: newSeason.title,
        number: newSeason.number,
        arcLabel: newSeason.arcLabel || undefined,
      });
      setSeasons((prev) => [...prev, season]);
      setNewSeason({ title: '', number: seasons.length + 2, arcLabel: '' });
      setShowCreateSeason(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create season');
    }
  }

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const ep = await adminApi.createEpisode(getToken()!, id, newEpisode);
      setEpisodes((prev) => [...prev, ep]);
      setNewEpisode({ title: '', description: '', isGated: false, tokenCost: 0 });
      setShowCreateEpisode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode');
    }
  }

  async function handlePublishEpisode(episodeId: string) {
    try {
      const updated = await adminApi.publishEpisode(getToken()!, episodeId);
      setEpisodes((prev) => prev.map((ep) => ep.id === episodeId ? updated : ep));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish episode');
    }
  }

  async function handleScheduleEpisode() {
    if (!scheduleModal || !scheduleAt) return;
    try {
      const updated = await adminApi.scheduleEpisode(getToken()!, scheduleModal, new Date(scheduleAt).toISOString());
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
      const updated = await adminApi.publishSeries(getToken()!, series.id);
      setSeries(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish series');
    }
  }

  async function handleUpdateEpisode() {
    if (!editingEpisode) return;
    setError('');
    try {
      const updated = await adminApi.updateEpisode(getToken()!, editingEpisode.id, editEpisodeData);
      setEpisodes((prev) => prev.map((ep) => ep.id === editingEpisode.id ? updated : ep));
      setEditingEpisode(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update episode');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    setError('');
    try {
      if (deleteConfirm.type === 'episode') {
        await adminApi.deleteEpisode(getToken()!, deleteConfirm.id);
        setEpisodes((prev) => prev.filter((ep) => ep.id !== deleteConfirm.id));
      } else {
        await adminApi.deleteSeries(getToken()!, deleteConfirm.id);
        router.push('/dashboard/series');
        return;
      }
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleUpdateSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!series) return;
    setError('');
    try {
      const payload: Record<string, unknown> = {};
      if (editSeriesData.title && editSeriesData.title !== series.title) payload.title = editSeriesData.title;
      if (editSeriesData.description !== (series.description ?? '')) payload.description = editSeriesData.description;
      if (editSeriesData.coverImageUrl !== (series.coverImageUrl ?? '')) payload.coverImageUrl = editSeriesData.coverImageUrl;
      const tags = editSeriesData.genreTags.split(',').map((t) => t.trim()).filter(Boolean);
      const currentTags = series.genreTags?.join(', ') ?? '';
      if (editSeriesData.genreTags !== currentTags) payload.genreTags = tags;

      if (Object.keys(payload).length > 0) {
        const updated = await adminApi.updateSeries(getToken()!, series.id, payload as Partial<{ title: string; description: string; genreTags: string[]; coverImageUrl: string }>);
        setSeries(updated);
      }
      setShowEditSeries(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update series');
    }
  }

  function openEditEpisode(ep: Episode) {
    setEditingEpisode(ep);
    setEditEpisodeData({
      title: ep.title,
      description: ep.description ?? '',
      isGated: ep.isGated,
      tokenCost: ep.tokenCost,
    });
  }

  function openEditSeries() {
    if (!series) return;
    setEditSeriesData({
      title: series.title,
      description: series.description ?? '',
      genreTags: series.genreTags?.join(', ') ?? '',
      coverImageUrl: series.coverImageUrl ?? '',
    });
    setShowEditSeries(true);
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
      const { uploadUrl, assetId } = await adminApi.getUploadUrl(
        getToken()!,
        activeUploadEpisodeId,
        file.type || 'video/mp4',
      );

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

      await adminApi.confirmUpload(getToken()!, assetId, file.size);
      setUploadProgress(100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      setActiveUploadEpisodeId(null);
    }
  }

  function statusBadge(status: string, isDeleted: boolean) {
    if (isDeleted) return <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-600/10 text-red-400 border border-red-500/10">deleted</span>;
    const colors: Record<string, string> = {
      published: 'bg-green-600/10 text-green-400 border border-green-500/10',
      scheduled: 'bg-blue-600/10 text-blue-400 border border-blue-500/10',
      draft: 'bg-gray-800 text-gray-400 border border-gray-700',
      unpublished: 'bg-yellow-600/10 text-yellow-400 border border-yellow-500/10',
      removed: 'bg-red-600/10 text-red-400 border border-red-500/10',
    };
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${colors[status] ?? 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
        {status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <a href="/dashboard/series" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block transition-colors">
        &larr; Back to series
      </a>

      {/* Series header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{series?.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {series && statusBadge(series.status, series.isDeleted)}
            <span className="text-sm text-gray-500">{series?.slug}</span>
          </div>
          {series?.description && (
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">{series.description}</p>
          )}
          {(series?.genreTags?.length ?? 0) > 0 && (
            <div className="flex gap-2 mt-2">
              {series?.genreTags?.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-md text-xs bg-purple-600/10 text-purple-400 border border-purple-500/10">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEditSeries}
            className="px-3 py-2 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Edit Series
          </button>
          {series?.status === 'draft' && (
            <button
              onClick={handlePublishSeries}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Publish Series
            </button>
          )}
          <button
            onClick={() => series && setDeleteConfirm({ type: 'series', id: series.id, title: series.title })}
            className="px-3 py-2 text-xs rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Series Analytics */}
      {analytics && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Analytics — {analytics.period}</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Views', value: analytics.totals.views.toLocaleString(), icon: '▶', color: 'bg-purple-600/10 text-purple-400 border-purple-500/10' },
              { label: 'Watch Time', value: `${Math.round(Number(analytics.totals.watchMinutes))}m`, icon: '⏱', color: 'bg-teal-600/10 text-teal-400 border-teal-500/10' },
              { label: 'Tokens Sold', value: Number(analytics.totals.tokensSold).toLocaleString(), icon: '⬡', color: 'bg-amber-600/10 text-amber-400 border-amber-500/10' },
              { label: 'Unlocks', value: analytics.totals.unlocks.toLocaleString(), icon: '↗', color: 'bg-green-600/10 text-green-400 border-green-500/10' },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl p-5 border ${card.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>

          {analytics.dailySnapshots.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-gray-800/60">
                <h3 className="text-sm font-semibold text-white">Daily Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800/60">
                    <th className="text-left text-gray-500 font-medium px-5 py-2.5 text-xs">Date</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Views</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Watch Time</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Tokens</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Unlocks</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-2.5 text-xs">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.dailySnapshots.map((d) => (
                    <tr key={d.date} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                      <td className="px-5 py-2.5 text-gray-300">
                        {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-2.5 text-right text-white font-medium">{d.views.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-right text-teal-400">{Math.round(Number(d.watchMinutes))}m</td>
                      <td className="px-5 py-2.5 text-right text-amber-400">{Number(d.tokensSold).toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-right text-green-400">{d.unlocks.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-right text-gray-400">
                        {d.completionRate != null ? `${Math.round(d.completionRate * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Seasons */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Seasons ({seasons.length})</h2>
          <button
            onClick={() => { setShowCreateSeason(!showCreateSeason); setNewSeason({ title: '', number: seasons.length + 1, arcLabel: '' }); }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 transition-colors"
          >
            {showCreateSeason ? 'Cancel' : '+ Add Season'}
          </button>
        </div>

        {showCreateSeason && (
          <form onSubmit={handleCreateSeason} className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5 mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Season Number</label>
                <input
                  type="number"
                  min={1}
                  value={newSeason.number}
                  onChange={(e) => setNewSeason({ ...newSeason, number: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
                <input
                  required
                  value={newSeason.title}
                  onChange={(e) => setNewSeason({ ...newSeason, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Season 2: The Awakening"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Arc Label</label>
                <input
                  value={newSeason.arcLabel}
                  onChange={(e) => setNewSeason({ ...newSeason, arcLabel: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Season 2"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors">
                Create Season
              </button>
            </div>
          </form>
        )}

        {seasons.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {seasons.sort((a, b) => a.number - b.number).map((s) => (
              <div key={s.id} className="bg-gray-900/50 border border-gray-800/60 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-purple-400 font-medium">Season {s.number}</span>
                    <p className="text-sm font-medium text-white mt-0.5">{s.title}</p>
                    {s.arcLabel && <p className="text-xs text-gray-500">{s.arcLabel}</p>}
                  </div>
                  <span className="text-xs text-gray-600">
                    {episodes.filter((ep) => (ep as Episode & { seasonId?: string }).seasonId === s.id).length} episodes
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {seasons.length === 0 && !showCreateSeason && (
          <p className="text-sm text-gray-600">No seasons defined yet. Episodes are organized by season.</p>
        )}
      </div>

      {/* Episodes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Episodes ({episodes.length})</h2>
        <button
          onClick={() => setShowCreateEpisode(!showCreateEpisode)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {showCreateEpisode ? 'Cancel' : '+ Add Episode'}
        </button>
      </div>

      {showCreateEpisode && (
        <form onSubmit={handleCreateEpisode} className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">New Episode</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
              <input
                required
                value={newEpisode.title}
                onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="Episode title"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Description</label>
              <textarea
                value={newEpisode.description}
                onChange={(e) => setNewEpisode({ ...newEpisode, description: e.target.value })}
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="Episode description"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEpisode.isGated}
                  onChange={(e) => setNewEpisode({ ...newEpisode, isGated: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <span className="text-sm text-gray-300">Token-gated</span>
              </label>
            </div>
            {newEpisode.isGated && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Token Cost</label>
                <input
                  type="number"
                  min={1}
                  value={newEpisode.tokenCost}
                  onChange={(e) => setNewEpisode({ ...newEpisode, tokenCost: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowCreateEpisode(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors">
              Create Episode
            </button>
          </div>
        </form>
      )}

      {/* Episodes table */}
      <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden">
        {episodes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No episodes yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/60 text-left">
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">#</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Title</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Gated</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Published</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-400">{ep.number}</td>
                  <td className="px-5 py-4 text-sm font-medium text-white">{ep.title}</td>
                  <td className="px-5 py-4">{statusBadge(ep.status, ep.isDeleted)}</td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {ep.isGated ? `${ep.tokenCost} tokens` : 'Free'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {ep.publishedAt
                      ? new Date(ep.publishedAt).toLocaleDateString()
                      : ep.scheduledAt
                      ? `Scheduled ${new Date(ep.scheduledAt).toLocaleDateString()}`
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditEpisode(ep)}
                        className="px-2.5 py-1 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleUploadClick(ep.id)}
                        disabled={uploading === ep.id}
                        className="px-2.5 py-1 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50"
                      >
                        {uploading === ep.id ? `${uploadProgress}%` : 'Upload'}
                      </button>
                      {(ep.status === 'draft' || ep.status === 'scheduled') && !ep.isDeleted && (
                        <button
                          onClick={() => handlePublishEpisode(ep.id)}
                          className="px-2.5 py-1 text-xs rounded-md bg-green-600/10 hover:bg-green-600/20 text-green-400 transition-colors"
                        >
                          Publish
                        </button>
                      )}
                      {ep.status === 'draft' && !ep.isDeleted && (
                        <button
                          onClick={() => { setScheduleModal(ep.id); setScheduleAt(''); }}
                          className="px-2.5 py-1 text-xs rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors"
                        >
                          Schedule
                        </button>
                      )}
                      {!ep.isDeleted && (
                        <button
                          onClick={() => setDeleteConfirm({ type: 'episode', id: ep.id, title: ep.title })}
                          className="px-2.5 py-1 text-xs rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors"
                        >
                          Delete
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

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4">Schedule Episode</h3>
            <label className="block text-xs text-gray-400 mb-1.5">Publish at</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setScheduleModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleScheduleEpisode}
                disabled={!scheduleAt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Episode modal */}
      {editingEpisode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4">Edit Episode #{editingEpisode.number}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title</label>
                <input
                  value={editEpisodeData.title ?? ''}
                  onChange={(e) => setEditEpisodeData({ ...editEpisodeData, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={editEpisodeData.description ?? ''}
                  onChange={(e) => setEditEpisodeData({ ...editEpisodeData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEpisodeData.isGated ?? false}
                      onChange={(e) => setEditEpisodeData({ ...editEpisodeData, isGated: e.target.checked })}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-300">Token-gated</span>
                  </label>
                </div>
                {editEpisodeData.isGated && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Token Cost</label>
                    <input
                      type="number"
                      min={0}
                      value={editEpisodeData.tokenCost ?? 0}
                      onChange={(e) => setEditEpisodeData({ ...editEpisodeData, tokenCost: parseInt(e.target.value) || 0 })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingEpisode(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpdateEpisode}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Series modal */}
      {showEditSeries && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4">Edit Series</h3>
            <form onSubmit={handleUpdateSeries} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title</label>
                <input
                  value={editSeriesData.title}
                  onChange={(e) => setEditSeriesData({ ...editSeriesData, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={editSeriesData.description}
                  onChange={(e) => setEditSeriesData({ ...editSeriesData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Genre Tags (comma-separated)</label>
                <input
                  value={editSeriesData.genreTags}
                  onChange={(e) => setEditSeriesData({ ...editSeriesData, genreTags: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="romantasy, enemies-to-lovers"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Cover Image URL</label>
                <input
                  value={editSeriesData.coverImageUrl}
                  onChange={(e) => setEditSeriesData({ ...editSeriesData, coverImageUrl: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowEditSeries(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete <strong className="text-white">{deleteConfirm.title}</strong>?
              {deleteConfirm.type === 'series' && ' This will also remove all its episodes.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
