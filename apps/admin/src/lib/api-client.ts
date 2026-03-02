/**
 * Typed API client for the FatedWorld NestJS backend.
 * All requests include the JWT Bearer token from the session.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? `API error: ${response.status}`);
  }

  const json = await response.json();
  // Unwrap the { data: T } envelope from the TransformInterceptor
  return ('data' in json ? json.data : json) as T;
}

export const adminApi = {
  // Series
  listSeries: (token: string) =>
    apiFetch<Series[]>('/v1/series?all=true', { token }),
  getSeries: (token: string, id: string) =>
    apiFetch<Series>(`/v1/series/${id}`, { token }),
  createSeries: (token: string, data: CreateSeriesInput) =>
    apiFetch<Series>('/v1/admin/series', { method: 'POST', body: JSON.stringify(data), token }),
  updateSeries: (token: string, id: string, data: Partial<CreateSeriesInput>) =>
    apiFetch<Series>(`/v1/admin/series/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  publishSeries: (token: string, id: string) =>
    apiFetch<Series>(`/v1/admin/series/${id}/publish`, { method: 'POST', token }),
  deleteSeries: (token: string, id: string) =>
    apiFetch<void>(`/v1/admin/series/${id}`, { method: 'DELETE', token }),
  restoreSeries: (token: string, id: string) =>
    apiFetch<Series>(`/v1/admin/series/${id}/restore`, { method: 'POST', token }),

  // Episodes
  listEpisodes: (token: string, seriesId: string) =>
    apiFetch<Episode[]>(`/v1/series/${seriesId}/episodes?all=true`, { token }),
  createEpisode: (token: string, seriesId: string, data: CreateEpisodeInput) =>
    apiFetch<Episode>(`/v1/admin/series/${seriesId}/episodes`, { method: 'POST', body: JSON.stringify(data), token }),
  publishEpisode: (token: string, id: string) =>
    apiFetch<Episode>(`/v1/admin/episodes/${id}/publish`, { method: 'POST', token }),
  scheduleEpisode: (token: string, id: string, scheduledAt: string) =>
    apiFetch<Episode>(`/v1/admin/episodes/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt }), token }),
  deleteEpisode: (token: string, id: string) =>
    apiFetch<void>(`/v1/admin/episodes/${id}`, { method: 'DELETE', token }),
  restoreEpisode: (token: string, id: string) =>
    apiFetch<Episode>(`/v1/admin/episodes/${id}/restore`, { method: 'POST', token }),

  // Video upload
  getUploadUrl: (token: string, episodeId: string, contentType: string) =>
    apiFetch<{ uploadUrl: string; assetId: string }>(
      `/v1/admin/episodes/${episodeId}/assets/upload-url`,
      { method: 'POST', body: JSON.stringify({ contentType, versionType: 'main' }), token },
    ),
  confirmUpload: (token: string, assetId: string, fileSizeBytes: number) =>
    apiFetch(`/v1/admin/assets/${assetId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ fileSizeBytes }),
      token,
    }),

  // Moderation
  getModerationQueue: (token: string, type?: string) =>
    apiFetch(`/v1/admin/moderation/queue${type ? `?type=${type}` : ''}`, { token }),
  banUser: (token: string, userId: string, reason: string) =>
    apiFetch(`/v1/admin/moderation/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ reason }), token }),
  unbanUser: (token: string, userId: string) =>
    apiFetch(`/v1/admin/moderation/users/${userId}/unban`, { method: 'POST', token }),
  approveWiki: (token: string, revisionId: string) =>
    apiFetch(`/v1/admin/wiki/revisions/${revisionId}/approve`, { method: 'POST', token }),
  rejectWiki: (token: string, revisionId: string, reason: string) =>
    apiFetch(`/v1/admin/wiki/revisions/${revisionId}/reject`, { method: 'POST', body: JSON.stringify({ reason }), token }),

  // Analytics
  getPlatformSnapshot: (token: string, days?: number) =>
    apiFetch(`/v1/admin/analytics/platform${days ? `?days=${days}` : ''}`, { token }),

  // Audit log
  getAuditLog: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<AuditLogEntry[]>(`/v1/admin/audit-log${qs}`, { token });
  },

  // Users
  listUsers: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<AdminUser[]>(`/v1/admin/users${qs}`, { token });
  },
  updateUserRole: (token: string, userId: string, role: string) =>
    apiFetch(`/v1/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }), token }),
  verifyAuthor: (token: string, userId: string) =>
    apiFetch(`/v1/admin/users/${userId}/verify-author`, { method: 'PATCH', token }),

  // Auth
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// Minimal type definitions (expand as needed)
export interface Series {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string;
  genreTags: string[];
  coverImageUrl?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  description?: string;
  status: string;
  isGated: boolean;
  tokenCost: number;
  scheduledAt?: string;
  publishedAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role: string;
  isVerifiedAuthor: boolean;
  isBanned: boolean;
  banExpiresAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

interface CreateSeriesInput {
  title: string;
  slug?: string;
  description?: string;
  genreTags?: string[];
}

interface CreateEpisodeInput {
  title: string;
  description?: string;
  isGated?: boolean;
  tokenCost?: number;
  scheduledAt?: string;
  seasonId?: string;
}
