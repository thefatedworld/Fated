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
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [targetPlatform, setTargetPlatform] = useState(PLATFORMS[0]);
  const [targetFormat, setTargetFormat] = useState(FORMATS[0]);
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
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

  async function handleRetry(jobId: string) {
    const token = getToken();
    if (!token) return;
    setRetrying(jobId);
    try {
      await adminApi.retryDistributionJob(token, jobId);
      loadData();
    } catch { /* ignore */ }
    setRetrying(null);
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
              <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Actions</th>
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
                <td className="px-4 py-3">
                  <span className="text-white font-medium">
                    {job.episode?.title ?? job.episodeId.slice(0, 8) + '...'}
                  </span>
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
                  <div className="flex items-center gap-2">
                    {(job.aiDescription || job.outputGcsKey) && (
                      <button
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
                      >
                        {expandedJob === job.id ? 'Hide' : 'View'}
                      </button>
                    )}
                    {(job.status === 'failed' || job.status === 'pending') && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={retrying === job.id}
                        className="text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        {retrying === job.id ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded job detail panels */}
      {jobs.filter((j) => expandedJob === j.id && (j.aiDescription || j.outputGcsKey)).map((job) => (
        <div key={`detail-${job.id}`} className="mt-4 bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="capitalize text-purple-400 text-sm font-medium">{job.targetPlatform}</span>
              <span className="text-gray-600">&middot;</span>
              <span className="text-gray-400 text-sm">{job.episode?.title ?? 'Unknown episode'}</span>
              <span className="text-gray-600">&middot;</span>
              <span className="text-gray-500 text-xs">{job.targetFormat.replace(/_/g, ' ')}</span>
            </div>
            <button
              onClick={() => setExpandedJob(null)}
              className="text-gray-500 hover:text-white text-sm"
            >
              &times;
            </button>
          </div>

          {job.aiDescription && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI Description</h4>
              <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-950/50 rounded-lg p-3 border border-gray-800/40">
                {job.aiDescription}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(job.aiDescription!)}
                className="mt-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
          )}

          {Array.isArray(job.aiTitleVariants) && job.aiTitleVariants.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Title Variants</h4>
              <div className="space-y-1.5">
                {job.aiTitleVariants.map((title, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm bg-gray-950/50 rounded-lg px-3 py-1.5 border border-gray-800/40 flex-1">
                      {String(title)}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(title))}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.aiTags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {job.aiTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                    title="Click to copy"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.aiCaption && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Caption</h4>
              <p className="text-gray-400 text-sm italic">{job.aiCaption}</p>
            </div>
          )}

          {job.errorMessage && (
            <div className="mt-3 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
              <p className="text-red-400 text-xs">{job.errorMessage}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
