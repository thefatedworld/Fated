/**
 * Analytics event helpers.
 * All calls are fire-and-forget — never throw.
 */

import { api } from './api-client';

let _sessionId = '';
let _userId = '';

export function initAnalytics(userId: string) {
  _userId = userId;
  _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function track(eventType: string, properties?: Record<string, unknown>) {
  api
    .trackEvent(eventType, {
      session_id: _sessionId,
      user_id: _userId,
      ...properties,
    })
    .catch(() => {
      // Fire and forget — analytics must never crash the app
    });
}

export const analytics = {
  playbackStart: (episodeId: string, seriesId: string) =>
    track('playback.start', { episode_id: episodeId, series_id: seriesId }),

  playbackProgress: (episodeId: string, positionSeconds: number, percentComplete: number) =>
    track('playback.progress', { episode_id: episodeId, position_seconds: positionSeconds, percent_complete: percentComplete }),

  playbackEnd: (episodeId: string, watchDuration: number, completed: boolean) =>
    track('playback.end', { episode_id: episodeId, watch_duration_seconds: watchDuration, completed }),

  playbackPause: (episodeId: string, positionSeconds: number) =>
    track('playback.pause', { episode_id: episodeId, position_seconds: positionSeconds }),

  tokenUnlocked: (episodeId: string, cost: number) =>
    track('token.unlocked', { episode_id: episodeId, cost }),

  seriesView: (seriesId: string) =>
    track('user.series_view', { series_id: seriesId }),

  episodeView: (episodeId: string, seriesId: string) =>
    track('user.episode_view', { episode_id: episodeId, series_id: seriesId }),
};
