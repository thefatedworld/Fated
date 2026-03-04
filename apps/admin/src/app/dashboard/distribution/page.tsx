'use client';

import { useEffect, useState } from 'react';
import { adminApi, type DistributionJob, type Series, type Episode } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-950/60 text-yellow-400 border-yellow-800/40',
  processing: 'bg-blue-950/60 text-blue-400 border-blue-800/40',
  completed: 'bg-green-950/60 text-green-400 border-green-800/40',
  failed: 'bg-red-950/60 text-red-400 border-red-800/40',
};

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'internal'];
const FORMATS = ['vertical_9_16', 'landscape_16_9', 'square_1_1'];

export default function DistributionPage() {
  const [jobs, setJobs] = useState<DistributionJob[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [targetPlatform, setTargetPlatform] = useState(PLATFORMS[0]);
  const [targetFormat, setTargetFormat] = useState(FORMATS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const token = getToken();
    if (!token) return;
    try {
      const [jobsData, seriesData] = await Promise.all([
        adminApi.listDistributionJobs(token),
        adminApi.listSeries(token),
      ]);
      setJobs(jobsData);
      setSeries(seriesData);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSeriesChange(sId: string) {
    setSelectedSeriesId(sId);
    setSelectedEpisodeId('');
    if (!sId) { setEpisodes([]); return; }
    const token = getToken();
    if (!token) return;
    const eps = await adminApi.listEpisodes(token, sId);
    setEpisodes(eps);
  }

  async function handleCreate() {
    if (!selectedEpisodeId) return;
    setCreating(true);
    setError('');
    const token = getToken();
    if (!token) return;
    try {
      await adminApi.createDistributionJob(token, {
        episodeId: selectedEpisodeId,
        targetPlatform,
        targetFormat,
      });
      setShowCreate(false);
      setSelectedSeriesId('');
      setSelectedEpisodeId('');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const episodeTitleMap = new Map<string, string>();
  episodes.forEach((e) => episodeTitleMap.set(e.id, `Ep ${e.number}: ${e.title}`));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Distribution</h1>
          <p className="text-sm text-gray-500 mt-1">
            Repackage episodes for YouTube, Instagram, and TikTok
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Job
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-white font-medium text-sm mb-4">Create Distribution Job</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Series</label>
              <select
                value={selectedSeriesId}
                onChange={(e) => handleSeriesChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select series...</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Episode</label>
              <select
                value={selectedEpisodeId}
                onChange={(e) => setSelectedEpisodeId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                disabled={!selectedSeriesId}
              >
                <option value="">Select episode...</option>
                {episodes.map((e) => (
                  <option key={e.id} value={e.id}>Ep {e.number}: {e.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Platform</label>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Format</label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!selectedEpisodeId || creating}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create Job'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs table */}
      <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800/60">
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Episode</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Platform</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Format</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Status</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Created</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Output</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-600 py-16">
                  No distribution jobs yet.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                <td className="px-4 py-3 text-white font-medium">
                  {job.episodeId.slice(0, 8)}...
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize text-gray-300">{job.targetPlatform}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {job.targetFormat.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLES[job.status] ?? 'bg-gray-800 text-gray-400'}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(job.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {job.outputGcsKey ? (
                    <span className="text-purple-400 text-xs" title={job.outputGcsKey}>
                      Output ready
                    </span>
                  ) : job.aiDescription ? (
                    <span className="text-green-400 text-xs">AI copy ready</span>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Copy preview */}
      {jobs.some((j) => j.aiDescription) && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">AI-Generated Copy</h3>
          <div className="space-y-3">
            {jobs.filter((j) => j.aiDescription).map((j) => (
              <div key={j.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="capitalize text-purple-400 text-xs font-medium">{j.targetPlatform}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{j.targetFormat.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{j.aiDescription}</p>
                {j.aiCaption && (
                  <p className="text-gray-500 text-xs mt-2 italic">{j.aiCaption}</p>
                )}
                {j.aiTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {j.aiTags.map((tag) => (
                      <span key={tag} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-md">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
