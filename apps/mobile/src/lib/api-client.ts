/**
 * Typed API client for FatedWorld mobile app.
 * Auth tokens are injected via the getToken callback,
 * which reads from SecureStore (see auth.ts).
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenGetter = () => Promise<string | null>;

let _getToken: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter) {
  _getToken = getter;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options ?? {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await _getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, body.message ?? `API error ${response.status}`);
  }

  const json = await response.json();
  return ('data' in json ? json.data : json) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Me {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  isVerifiedAuthor: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface TokenWallet {
  balance: number;
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  genreTags: string[];
  status: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  description?: string;
  durationSeconds?: number;
  status: string;
  isGated: boolean;
  tokenCost: number;
  publishedAt?: string;
}

export interface EntitlementCheck {
  entitled: boolean;
  source: 'episode_unlock' | 'season_pass' | 'free' | 'none';
}

export interface PlaybackUrl {
  playbackUrl: string;
  expiresAt: string;
}

export interface Thread {
  id: string;
  type: string;
  seriesId?: string;
  episodeId?: string;
  authorId: string;
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  voteCount: number;
  createdAt: string;
}

export interface ThreadReply {
  id: string;
  threadId: string;
  parentId?: string;
  authorId: string;
  body: string;
  voteCount: number;
  createdAt: string;
}

export interface NotificationPreferences {
  episodeDrops: boolean;
  countdownReminders: boolean;
  communityReplies: boolean;
  authorQa: boolean;
  promotions: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API methods
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    apiFetch<AuthTokens>('/v1/auth/register', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),

  login: (email: string, password: string) =>
    apiFetch<AuthTokens>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true }),

  refresh: (refreshToken: string, deviceId?: string) =>
    apiFetch<AuthTokens>('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken, deviceId }), skipAuth: true }),

  logout: (refreshToken: string) =>
    apiFetch<void>('/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  // Me
  getMe: () =>
    apiFetch<Me>('/v1/users/me'),

  updateMe: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    apiFetch<Me>('/v1/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Tokens
  getWallet: () =>
    apiFetch<TokenWallet>('/v1/tokens/wallet'),

  // Series
  listSeries: () =>
    apiFetch<Series[]>('/v1/series'),

  getSeries: (id: string) =>
    apiFetch<Series>(`/v1/series/${id}`),

  // Episodes
  listEpisodes: (seriesId: string) =>
    apiFetch<Episode[]>(`/v1/series/${seriesId}/episodes`),

  getEpisode: (id: string) =>
    apiFetch<Episode>(`/v1/episodes/${id}`),

  // Playback
  getPlaybackUrl: (episodeId: string) =>
    apiFetch<PlaybackUrl>(`/v1/episodes/${episodeId}/playback`),

  // Entitlements
  checkEntitlement: (episodeId: string) =>
    apiFetch<EntitlementCheck>(`/v1/episodes/${episodeId}/entitlement`),

  unlockEpisode: (episodeId: string) =>
    apiFetch<EntitlementCheck>(`/v1/episodes/${episodeId}/unlock`, { method: 'POST' }),

  // IAP
  validateAppleIAP: (jwsTransaction: string) =>
    apiFetch<{ tokensAdded: number; newBalance: number }>('/v1/iap/apple/validate', {
      method: 'POST',
      body: JSON.stringify({ jwsTransaction }),
    }),

  validateGoogleIAP: (purchaseToken: string, productId: string) =>
    apiFetch<{ tokensAdded: number; newBalance: number }>('/v1/iap/google/validate', {
      method: 'POST',
      body: JSON.stringify({ purchaseToken, productId }),
    }),

  // Push tokens
  registerPushToken: (fcmToken: string, platform: 'ios' | 'android', deviceId?: string) =>
    apiFetch<void>('/v1/users/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken, platform, deviceId }),
    }),

  // Notifications preferences
  getNotificationPreferences: () =>
    apiFetch<NotificationPreferences>('/v1/users/me/notification-preferences'),

  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) =>
    apiFetch<NotificationPreferences>('/v1/users/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),

  // Community
  listThreads: (type: string, contextId?: string, cursor?: string) => {
    const params = new URLSearchParams({ type });
    if (contextId) params.set('contextId', contextId);
    if (cursor) params.set('cursor', cursor);
    return apiFetch<Thread[]>(`/v1/community/threads?${params.toString()}`);
  },

  getThread: (threadId: string) =>
    apiFetch<Thread>(`/v1/community/threads/${threadId}`),

  createThread: (data: { type: string; title: string; body: string; seriesId?: string; episodeId?: string }) =>
    apiFetch<Thread>('/v1/community/threads', { method: 'POST', body: JSON.stringify(data) }),

  listReplies: (threadId: string, cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : '';
    return apiFetch<ThreadReply[]>(`/v1/community/threads/${threadId}/replies${params}`);
  },

  createReply: (threadId: string, body: string, parentId?: string) =>
    apiFetch<ThreadReply>(`/v1/community/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body, parentId }),
    }),

  vote: (targetType: 'thread' | 'reply', targetId: string, value: 1 | -1) =>
    apiFetch<void>('/v1/community/votes', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, value }),
    }),

  // Recommendations
  getRecommendations: () =>
    apiFetch<{ seriesId: string; score: number; reasonCode: string }[]>('/v1/recommendations'),

  // Analytics
  trackEvent: (eventType: string, properties?: Record<string, unknown>) =>
    apiFetch<void>('/v1/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ eventType, properties }),
    }),

  // Compliance
  requestDataExport: () =>
    apiFetch<void>('/v1/account/data-export', { method: 'POST' }),
};
