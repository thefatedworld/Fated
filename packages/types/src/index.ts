/**
 * Shared types for FatedWorld API responses.
 * Generated manually; will be replaced with OpenAPI-generated types in Phase 2+.
 */

export type UserRole =
  | 'user'
  | 'approved_member'
  | 'moderator'
  | 'author'
  | 'content_admin'
  | 'analytics_admin'
  | 'superadmin';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  isVerifiedAuthor: boolean;
  createdAt: string;
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  genreTags: string[];
  coverImageUrl: string | null;
  status: 'draft' | 'published' | 'completed' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonId: string | null;
  number: number;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  isGated: boolean;
  tokenCost: number;
  status: 'draft' | 'scheduled' | 'published' | 'unpublished' | 'removed';
  scheduledAt: string | null;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TokenWallet {
  balance: string; // BigInt serialized as string
}

export interface Entitlement {
  id: string;
  type: 'episode_unlock' | 'season_pass' | 'early_access' | 'author_access';
  episodeId: string | null;
  seasonId: string | null;
  seriesId: string | null;
  grantedAt: string;
  revokedAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export interface PlaybackUrl {
  playbackUrl: string;
  expiresAt: string;
}

export interface EntitlementCheck {
  entitled: boolean;
  source: 'episode_unlock' | 'season_pass' | 'free' | 'none';
}
