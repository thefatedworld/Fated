'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api-client';

interface PlatformSnapshot {
  date: string;
  newUsers: number;
  totalViews: number;
  totalWatchMinutes: string;
  tokensSold: string;
  unlocks: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<PlatformSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fated_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    adminApi.getPlatformSnapshot(token, 7)
      .then((data) => setSnapshots(data as PlatformSnapshot[]))
      .catch((err) => {
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          router.push('/login');
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <nav className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="text-white">Dashboard</a>
          <a href="/dashboard/series" className="hover:text-white">Series</a>
          <a href="/dashboard/moderation" className="hover:text-white">Moderation</a>
          <a href="/dashboard/users" className="hover:text-white">Users</a>
          <a href="/dashboard/audit" className="hover:text-white">Audit Log</a>
        </nav>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Platform Overview (Last 7 Days)</h2>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
            <p>No analytics data yet. Data appears after the first day of activity.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Views', value: snapshots.reduce((a, s) => a + s.totalViews, 0).toLocaleString() },
              { label: 'New Users', value: snapshots.reduce((a, s) => a + s.newUsers, 0).toLocaleString() },
              { label: 'Tokens Sold', value: snapshots.reduce((a, s) => a + BigInt(s.tokensSold), BigInt(0)).toString() },
              { label: 'Unlocks', value: snapshots.reduce((a, s) => a + s.unlocks, 0).toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/dashboard/series/new" className="block w-full text-center py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
                + Create New Series
              </a>
              <a href="/dashboard/moderation" className="block w-full text-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                View Moderation Queue
              </a>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">API</span>
                <span className="text-green-400">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Database</span>
                <span className="text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Environment</span>
                <span className="text-yellow-400">{process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'staging'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
