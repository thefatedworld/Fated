'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';

interface Series {
  id: string;
  title: string;
  slug: string;
  status: string;
  genreTags: string[];
  createdAt: string;
}

export default function SeriesPage() {
  const router = useRouter();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fated_access_token');
    if (!token) { router.push('/login'); return; }

    adminApi.listSeries(token)
      .then((data) => setSeries(data as Series[]))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/dashboard/series" className="text-white">Series</a>
          <a href="/dashboard/moderation" className="hover:text-white">Moderation</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Series</h2>
          <a
            href="/dashboard/series/new"
            className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            + New Series
          </a>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : series.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
            <p className="text-gray-400">No series yet.</p>
            <a href="/dashboard/series/new" className="mt-4 inline-block py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium">
              Create your first series
            </a>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-xs text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {series.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-sm text-gray-400">{s.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        s.status === 'published' ? 'bg-green-900/50 text-green-400' :
                        s.status === 'draft' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {s.genreTags.slice(0, 3).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/dashboard/series/${s.id}`} className="text-sm text-purple-400 hover:text-purple-300">
                        Manage
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
