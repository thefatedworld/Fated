'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AdminUser } from '@/lib/api-client';

const ROLES = ['user', 'approved_member', 'moderator', 'author', 'content_admin', 'analytics_admin', 'superadmin'];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banModal, setBanModal] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [roleModal, setRoleModal] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [filterBanned, setFilterBanned] = useState(false);

  function getToken() {
    return localStorage.getItem('fated_access_token') ?? '';
  }

  async function load(banned?: boolean) {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const data = await adminApi.listUsers(token, banned ? { banned: 'true' } : undefined);
      setUsers(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filterBanned); }, [filterBanned]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBan() {
    if (!banModal) return;
    setError('');
    try {
      await adminApi.banUser(getToken(), banModal.id, banReason);
      setUsers((prev) => prev.map((u) => u.id === banModal.id ? { ...u, isBanned: true } : u));
      setBanModal(null);
      setBanReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    }
  }

  async function handleUnban(userId: string) {
    setError('');
    try {
      await adminApi.unbanUser(getToken(), userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false, banExpiresAt: undefined } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    }
  }

  async function handleUpdateRole() {
    if (!roleModal || !selectedRole) return;
    setError('');
    try {
      await adminApi.updateUserRole(getToken(), roleModal.id, selectedRole);
      setUsers((prev) => prev.map((u) => u.id === roleModal.id ? { ...u, role: selectedRole } : u));
      setRoleModal(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleVerifyAuthor(userId: string) {
    setError('');
    try {
      await adminApi.verifyAuthor(getToken(), userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isVerifiedAuthor: true, role: 'author' } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify author');
    }
  }

  function roleBadge(role: string) {
    const colors: Record<string, string> = {
      superadmin: 'bg-red-900/50 text-red-400',
      content_admin: 'bg-orange-900/50 text-orange-400',
      analytics_admin: 'bg-orange-900/50 text-orange-400',
      moderator: 'bg-blue-900/50 text-blue-400',
      author: 'bg-purple-900/50 text-purple-400',
      approved_member: 'bg-green-900/50 text-green-400',
      user: 'bg-gray-700 text-gray-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[role] ?? 'bg-gray-700 text-gray-400'}`}>
        {role}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">FatedWorld Admin</h1>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/dashboard/series" className="hover:text-white">Series</a>
          <a href="/dashboard/users" className="text-white">Users</a>
          <a href="/dashboard/moderation" className="hover:text-white">Moderation</a>
          <a href="/dashboard/audit" className="hover:text-white">Audit Log</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Users</h2>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={filterBanned}
              onChange={(e) => setFilterBanned(e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            Show banned only
          </label>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No users found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs text-gray-400 uppercase">User</th>
                    <th className="px-6 py-3 text-xs text-gray-400 uppercase">Role</th>
                    <th className="px-6 py-3 text-xs text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs text-gray-400 uppercase">Joined</th>
                    <th className="px-6 py-3 text-xs text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{user.username}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                        {user.isVerifiedAuthor && (
                          <span className="text-xs text-purple-400">✓ Verified Author</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{roleBadge(user.role)}</td>
                      <td className="px-6 py-4">
                        {user.isBanned ? (
                          <span className="px-2 py-1 rounded text-xs bg-red-900/50 text-red-400">
                            Banned{user.banExpiresAt ? ` until ${new Date(user.banExpiresAt).toLocaleDateString()}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-green-900/50 text-green-400">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setRoleModal(user); setSelectedRole(user.role); }}
                            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                          >
                            Role
                          </button>
                          {!user.isVerifiedAuthor && (
                            <button
                              onClick={() => handleVerifyAuthor(user.id)}
                              className="px-2 py-1 text-xs rounded bg-purple-900 hover:bg-purple-800 text-purple-300 transition-colors"
                            >
                              Verify
                            </button>
                          )}
                          {user.isBanned ? (
                            <button
                              onClick={() => handleUnban(user.id)}
                              className="px-2 py-1 text-xs rounded bg-green-900 hover:bg-green-800 text-green-300 transition-colors"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => { setBanModal(user); setBanReason(''); }}
                              className="px-2 py-1 text-xs rounded bg-red-900 hover:bg-red-800 text-red-300 transition-colors"
                            >
                              Ban
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
        )}
      </main>

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold mb-1">Ban User</h3>
            <p className="text-sm text-gray-400 mb-4">{banModal.username}</p>
            <label className="block text-xs text-gray-400 mb-1">Reason *</label>
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 mb-4"
              placeholder="Ban reason"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setBanModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold mb-1">Update Role</h3>
            <p className="text-sm text-gray-400 mb-4">{roleModal.username}</p>
            <label className="block text-xs text-gray-400 mb-1">New role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 mb-4"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRoleModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
