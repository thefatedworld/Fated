'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AdminUser } from '@/lib/api-client';
import { getToken } from '@/lib/utils';

const ROLES = ['user', 'approved_member', 'moderator', 'author', 'content_admin', 'analytics_admin', 'superadmin'];
const TIMEOUT_DURATIONS = [
  { label: '1 hour', secs: 3600 },
  { label: '12 hours', secs: 43200 },
  { label: '1 day', secs: 86400 },
  { label: '3 days', secs: 259200 },
  { label: '7 days', secs: 604800 },
  { label: '30 days', secs: 2592000 },
];

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
  const [timeoutModal, setTimeoutModal] = useState<AdminUser | null>(null);
  const [timeoutReason, setTimeoutReason] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(86400);

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
      await adminApi.banUser(getToken()!, banModal.id, banReason);
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
      await adminApi.unbanUser(getToken()!, userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false, banExpiresAt: undefined } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    }
  }

  async function handleUpdateRole() {
    if (!roleModal || !selectedRole) return;
    setError('');
    try {
      await adminApi.updateUserRole(getToken()!, roleModal.id, selectedRole);
      setUsers((prev) => prev.map((u) => u.id === roleModal.id ? { ...u, role: selectedRole } : u));
      setRoleModal(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleVerifyAuthor(userId: string) {
    setError('');
    try {
      await adminApi.verifyAuthor(getToken()!, userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isVerifiedAuthor: true, role: 'author' } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify author');
    }
  }

  async function handleTimeout() {
    if (!timeoutModal) return;
    setError('');
    try {
      await adminApi.timeoutUser(getToken()!, timeoutModal.id, timeoutReason, timeoutDuration);
      const expiresAt = new Date(Date.now() + timeoutDuration * 1000).toISOString();
      setUsers((prev) => prev.map((u) => u.id === timeoutModal.id ? { ...u, isBanned: true, banExpiresAt: expiresAt } : u));
      setTimeoutModal(null);
      setTimeoutReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to timeout user');
    }
  }

  const roleBadgeColor: Record<string, string> = {
    superadmin: 'bg-red-600/10 text-red-400 border-red-500/10',
    content_admin: 'bg-orange-600/10 text-orange-400 border-orange-500/10',
    analytics_admin: 'bg-orange-600/10 text-orange-400 border-orange-500/10',
    moderator: 'bg-blue-600/10 text-blue-400 border-blue-500/10',
    author: 'bg-purple-600/10 text-purple-400 border-purple-500/10',
    approved_member: 'bg-green-600/10 text-green-400 border-green-500/10',
    user: 'bg-gray-800 text-gray-400 border-gray-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage accounts and permissions</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterBanned}
            onChange={(e) => setFilterBanned(e.target.checked)}
            className="w-4 h-4 accent-purple-600 rounded"
          />
          Banned only
        </label>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No users found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60 text-left">
                  <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">User</th>
                  <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Role</th>
                  <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                  <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Joined</th>
                  <th className="px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-white">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {user.isVerifiedAuthor && (
                        <span className="text-xs text-purple-400">Verified Author</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${roleBadgeColor[user.role] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.isBanned ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-600/10 text-red-400 border border-red-500/10">
                          Banned{user.banExpiresAt ? ` until ${new Date(user.banExpiresAt).toLocaleDateString()}` : ''}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-600/10 text-green-400 border border-green-500/10">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setRoleModal(user); setSelectedRole(user.role); }}
                          className="px-2.5 py-1 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                        >
                          Role
                        </button>
                        {!user.isVerifiedAuthor && (
                          <button
                            onClick={() => handleVerifyAuthor(user.id)}
                            className="px-2.5 py-1 text-xs rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-2.5 py-1 text-xs rounded-md bg-green-600/10 hover:bg-green-600/20 text-green-400 transition-colors"
                          >
                            Unban
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { setTimeoutModal(user); setTimeoutReason(''); setTimeoutDuration(86400); }}
                              className="px-2.5 py-1 text-xs rounded-md bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 transition-colors"
                            >
                              Timeout
                            </button>
                            <button
                              onClick={() => { setBanModal(user); setBanReason(''); }}
                              className="px-2.5 py-1 text-xs rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors"
                            >
                              Ban
                            </button>
                          </>
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

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-1">Ban User</h3>
            <p className="text-sm text-gray-400 mb-4">{banModal.username}</p>
            <label className="block text-xs text-gray-400 mb-1.5">Reason *</label>
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 mb-4"
              placeholder="Ban reason"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setBanModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-1">Update Role</h3>
            <p className="text-sm text-gray-400 mb-4">{roleModal.username}</p>
            <label className="block text-xs text-gray-400 mb-1.5">New role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 mb-4"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRoleModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeout modal */}
      {timeoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-1">Timeout User</h3>
            <p className="text-sm text-gray-400 mb-4">{timeoutModal.username}</p>
            <label className="block text-xs text-gray-400 mb-1.5">Duration</label>
            <select
              value={timeoutDuration}
              onChange={(e) => setTimeoutDuration(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 mb-4"
            >
              {TIMEOUT_DURATIONS.map((d) => (
                <option key={d.secs} value={d.secs}>{d.label}</option>
              ))}
            </select>
            <label className="block text-xs text-gray-400 mb-1.5">Reason *</label>
            <input
              value={timeoutReason}
              onChange={(e) => setTimeoutReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 mb-4"
              placeholder="Timeout reason"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setTimeoutModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleTimeout}
                disabled={!timeoutReason}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                Apply Timeout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
