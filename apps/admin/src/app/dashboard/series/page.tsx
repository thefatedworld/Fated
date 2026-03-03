'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

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
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    adminApi.listSeries(token)
      .then((data) => setSeries(data as Series[]))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Series</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your content catalog</p>
        </div>
        <a
          href="/dashboard/series/new"
          className="py-2 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          + New Series
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : series.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">No series yet.</p>
          <a href="/dashboard/series/new" className="inline-block py-2 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white">
            Create your first series
          </a>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/60 text-left">
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Title</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Tags</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Created</th>
                <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {series.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.slug}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      s.status === 'published' ? 'bg-green-600/10 text-green-400 border border-green-500/10' :
                      s.status === 'draft' ? 'bg-yellow-600/10 text-yellow-400 border border-yellow-500/10' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {s.genreTags.slice(0, 3).join(', ')}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <a href={`/dashboard/series/${s.id}`} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                      Manage
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
