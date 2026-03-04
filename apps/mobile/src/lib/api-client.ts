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

export interface TokenLedgerEntry {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId?: string;
  createdAt: string;
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  seriesId?: string;
  taxonomyPath?: string;
  tags: string[];
  isPublished: boolean;
  currentRevId?: string;
  currentRevision?: {
    id: string;
    body: string;
    versionNum: number;
    authorId: string;
    createdAt: string;
  };
}

export interface WikiRevision {
  id: string;
  wikiPageId: string;
  versionNum: number;
  authorId: string;
  authorName?: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
}

export interface Entitlement {
  id: string;
  userId: string;
  type: string;
  seriesId?: string;
  episodeId?: string;
  createdAt: string;
}

export interface AuthorSeriesStats {
  seriesId: string;
  title: string;
  totalViews: number;
  subscribers: number;
  episodeCount: number;
}

export interface DistributionJob {
  id: string;
  seriesId: string;
  format: 'podcast' | 'audiogram' | 'social_clip';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
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

  // Watchlist
  getWatchlist: () =>
    apiFetch<Series[]>('/v1/watchlist'),

  checkWatchlist: (seriesId: string) =>
    apiFetch<{ onWatchlist: boolean }>(`/v1/watchlist/${seriesId}/check`),

  addToWatchlist: (seriesId: string) =>
    apiFetch<{ added: boolean }>(`/v1/watchlist/${seriesId}`, { method: 'POST' }),

  removeFromWatchlist: (seriesId: string) =>
    apiFetch<{ removed: boolean }>(`/v1/watchlist/${seriesId}`, { method: 'DELETE' }),

  // Community
  listThreads: (type?: string, seriesId?: string, sort?: 'new' | 'hot', cursor?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (seriesId) params.set('seriesId', seriesId);
    if (sort) params.set('sort', sort);
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
    apiFetch<{ voted: boolean; value: number }>(
      `/v1/community/${targetType === 'thread' ? 'threads' : 'replies'}/${targetId}/vote`,
      { method: 'POST', body: JSON.stringify({ value }) },
    ),

  deleteThread: (threadId: string) =>
    apiFetch<void>(`/v1/community/threads/${threadId}`, { method: 'DELETE' }),

  deleteReply: (replyId: string) =>
    apiFetch<void>(`/v1/community/replies/${replyId}`, { method: 'DELETE' }),

  reportAbuse: (targetType: string, targetId: string, category: string, description?: string) =>
    apiFetch<{ id: string }>('/v1/community/reports', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, category, description }),
    }),

  pinThread: (threadId: string, pinned: boolean) =>
    apiFetch<void>(`/v1/admin/moderation/threads/${threadId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    }),

  lockThread: (threadId: string, locked: boolean) =>
    apiFetch<void>(`/v1/admin/moderation/threads/${threadId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ locked }),
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

  // Token history
  getTokenHistory: (cursor?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return apiFetch<TokenLedgerEntry[]>(`/v1/tokens/history${qs ? `?${qs}` : ''}`);
  },

  // Wiki
  listWikiPages: (seriesId: string) =>
    apiFetch<WikiPage[]>(`/v1/wiki?seriesId=${seriesId}`),

  getWikiPage: (slug: string) =>
    apiFetch<WikiPage>(`/v1/wiki/${slug}`),

  getWikiPageRevisions: (slug: string) =>
    apiFetch<WikiRevision[]>(`/v1/wiki/${slug}/revisions`),

  // Entitlements (list)
  getMyEntitlements: () =>
    apiFetch<Entitlement[]>('/v1/entitlements'),

  // Search (uses series list with filter on client side — or a query param if API supports it)
  searchSeries: (query: string) =>
    apiFetch<Series[]>(`/v1/series?search=${encodeURIComponent(query)}`),

  // Author analytics
  getAuthorSeriesAnalytics: (seriesId: string) =>
    apiFetch<{ seriesId: string; totals: { views: number; unlocks: number }; dailySnapshots: { date: string; views: number; unlocks: number }[] }>(
      `/v1/author/series/${seriesId}/analytics`,
    ),

  getAuthorDashboard: () =>
    apiFetch<AuthorSeriesStats[]>('/v1/author/dashboard'),

  // Distribution jobs
  listDistributionJobs: () =>
    apiFetch<DistributionJob[]>('/v1/author/distribution-jobs'),

  // Compliance
  requestDataExport: () =>
    apiFetch<void>('/v1/account/data-export', { method: 'POST' }),
};
