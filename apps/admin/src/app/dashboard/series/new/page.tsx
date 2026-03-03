'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

export default function NewSeriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    setLoading(true);
    setError('');

    const genreTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      const series = await adminApi.createSeries(token, {
        title,
        slug: slug || undefined,
        description: description || undefined,
        genreTags: genreTags.length > 0 ? genreTags : undefined,
      });
      router.push(`/dashboard/series/${series.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
      setLoading(false);
    }
  }

  return (
    <div>
      <a href="/dashboard/series" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block transition-colors">
        &larr; Back to series
      </a>

      <h1 className="text-2xl font-bold text-white mb-6">Create New Series</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Title *</label>
          <input
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug || slug === autoSlug(title)) {
                setSlug(autoSlug(e.target.value));
              }
            }}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="e.g. The Starlit Court"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="the-starlit-court"
          />
          <p className="text-xs text-gray-600 mt-1">URL-friendly identifier. Auto-generated from title if left blank.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="A brief synopsis of the series..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Genre Tags</label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="romantasy, dark fantasy, slow burn"
          />
          <p className="text-xs text-gray-600 mt-1">Comma-separated list of genre tags.</p>
          {tagsInput && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-md text-xs bg-purple-600/10 text-purple-400 border border-purple-500/10">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <a href="/dashboard/series" className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
            Cancel
          </a>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Creating...' : 'Create Series'}
          </button>
        </div>
      </form>
    </div>
  );
}
