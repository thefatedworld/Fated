import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, EntitlementCheck } from '@/lib/api-client';
import { useUiStore } from '@/store/ui.store';
import VideoPlayer, { type EpisodeMeta } from '@/components/VideoPlayer';
import UnlockModal from '@/components/UnlockModal';
import { analytics } from '@/lib/analytics';
import { Ionicons } from '@expo/vector-icons';

const AUTOPLAY_SECONDS = 5;
const EPISODES_BEFORE_STILL_WATCHING = 4;

export default function EpisodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTokenBalance = useUiStore((s) => s.refreshTokenBalance);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const playbackRequested = useRef(false);

  // Autoplay state
  const [showAutoplay, setShowAutoplay] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(AUTOPLAY_SECONDS);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // "Are you still watching?" state
  const [showStillWatching, setShowStillWatching] = useState(false);
  const consecutiveEpisodesRef = useRef(0);

  const { data: episode, isLoading: epLoading } = useQuery({
    queryKey: ['episode', id],
    queryFn: () => api.getEpisode(id),
    enabled: !!id,
  });

  const seriesId = episode?.seriesId;

  const { data: allEpisodes } = useQuery({
    queryKey: ['episodes', seriesId],
    queryFn: () => api.listEpisodes(seriesId!),
    enabled: !!seriesId,
  });

  const { data: entitlement, isLoading: entitlementLoading } = useQuery({
    queryKey: ['entitlement', id],
    queryFn: () => api.checkEntitlement(id),
    enabled: !!id,
  });

  const unlockMutation = useMutation({
    mutationFn: () => api.unlockEpisode(id),
    onSuccess: () => {
      queryClient.setQueryData<EntitlementCheck>(['entitlement', id], {
        entitled: true,
        source: 'episode_unlock',
      });
      refreshTokenBalance();
      setShowUnlockModal(false);
    },
  });

  // Compute prev/next
  const sortedEpisodes = (allEpisodes ?? []).sort((a: any, b: any) => a.number - b.number);
  const currentIndex = sortedEpisodes.findIndex((ep: any) => ep.id === id);
  const prevEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1
    ? sortedEpisodes[currentIndex + 1]
    : null;

  useEffect(() => {
    if (!entitlement?.entitled || playbackRequested.current) return;
    playbackRequested.current = true;

    api.getPlaybackUrl(id).then(({ playbackUrl: url }) => {
      setPlaybackUrl(url);
      if (episode) analytics.playbackStart(id, episode.seriesId);
    }).catch(() => {});
  }, [entitlement?.entitled, id, episode]);

  // Reset state when episode changes
  useEffect(() => {
    playbackRequested.current = false;
    setPlaybackUrl(null);
    setShowAutoplay(false);
    setAutoplayCountdown(AUTOPLAY_SECONDS);
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, [id]);

  const handlePlaybackProgress = useCallback(
    (positionSeconds: number, percentComplete: number) => {
      analytics.playbackProgress(id, positionSeconds, percentComplete);
    },
    [id],
  );

  const handlePlaybackEnd = useCallback(
    (watchDuration: number, completed: boolean) => {
      analytics.playbackEnd(id, watchDuration, completed);

      if (!nextEpisode) return;

      consecutiveEpisodesRef.current += 1;

      if (consecutiveEpisodesRef.current >= EPISODES_BEFORE_STILL_WATCHING) {
        setShowStillWatching(true);
        return;
      }

      startAutoplayCountdown();
    },
    [id, nextEpisode],
  );

  function startAutoplayCountdown() {
    setShowAutoplay(true);
    setAutoplayCountdown(AUTOPLAY_SECONDS);

    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);

    let remaining = AUTOPLAY_SECONDS;
    autoplayTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAutoplayCountdown(remaining);
      if (remaining <= 0) {
        if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
        navigateToNext();
      }
    }, 1000);
  }

  function cancelAutoplay() {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplay(false);
  }

  function navigateToNext() {
    if (!nextEpisode) return;
    setShowAutoplay(false);
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    router.replace(`/episode/${nextEpisode.id}`);
  }

  function navigateToPrev() {
    if (!prevEpisode) return;
    consecutiveEpisodesRef.current = 0;
    router.replace(`/episode/${prevEpisode.id}`);
  }

  function handleStillWatchingContinue() {
    setShowStillWatching(false);
    consecutiveEpisodesRef.current = 0;
    startAutoplayCountdown();
  }

  function handleStillWatchingExit() {
    setShowStillWatching(false);
    consecutiveEpisodesRef.current = 0;
    router.back();
  }

  useEffect(() => {
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, []);

  if (epLoading || entitlementLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!episode) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFoundText}>Episode not found.</Text>
      </View>
    );
  }

  const isEntitled = entitlement?.entitled ?? false;

  const episodeMeta: EpisodeMeta = {
    id: episode.id,
    title: episode.title,
    description: episode.description,
    number: episode.number,
  };

  return (
    <View style={styles.container}>
      {isEntitled && playbackUrl ? (
        <VideoPlayer
          uri={playbackUrl}
          episode={episodeMeta}
          nextEpisode={nextEpisode ? { id: nextEpisode.id, title: nextEpisode.title, description: nextEpisode.description, number: nextEpisode.number } : null}
          hasPrev={!!prevEpisode}
          hasNext={!!nextEpisode}
          onProgress={handlePlaybackProgress}
          onEnd={handlePlaybackEnd}
          onNext={navigateToNext}
          onPrev={navigateToPrev}
          onClose={() => router.back()}
        />
      ) : isEntitled && !playbackUrl ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator color="#a855f7" size="large" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      ) : (
        <View style={[styles.container, styles.center, { paddingHorizontal: 32 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Ionicons name="lock-closed" size={48} color="#7c3aed" />
          <Text style={styles.lockedTitle}>{episode.title}</Text>
          {episode.isGated && (
            <Text style={styles.lockedCost}>
              Unlock for {episode.tokenCost} tokens
            </Text>
          )}
          {episode.isGated ? (
            <TouchableOpacity
              onPress={() => setShowUnlockModal(true)}
              style={styles.unlockButton}
              activeOpacity={0.85}
            >
              <Text style={styles.unlockButtonText}>
                Unlock — {episode.tokenCost} Tokens
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.lockedCost}>
              This episode is not yet available.
            </Text>
          )}
        </View>
      )}

      {/* Autoplay countdown overlay */}
      {showAutoplay && nextEpisode && (
        <View style={styles.autoplayOverlay}>
          <View style={styles.autoplayCard}>
            <View style={styles.autoplayCountdownCircle}>
              <Text style={styles.autoplayCountdownText}>{autoplayCountdown}</Text>
            </View>
            <View style={styles.autoplayInfo}>
              <Text style={styles.autoplayLabel}>Next Episode</Text>
              <Text style={styles.autoplayTitle} numberOfLines={1}>
                {nextEpisode.number}. {nextEpisode.title}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelAutoplay} style={styles.autoplayCancelButton}>
              <Text style={styles.autoplayCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* "Are you still watching?" overlay */}
      {showStillWatching && (
        <View style={styles.stillWatchingOverlay}>
          <View style={styles.stillWatchingCard}>
            <Text style={styles.stillWatchingTitle}>Are you still watching?</Text>
            <Text style={styles.stillWatchingSubtitle}>
              You've watched {EPISODES_BEFORE_STILL_WATCHING} episodes in a row
            </Text>
            <View style={styles.stillWatchingButtons}>
              <TouchableOpacity
                onPress={handleStillWatchingContinue}
                style={styles.stillWatchingContinue}
              >
                <Ionicons name="play" size={18} color="#ffffff" />
                <Text style={styles.stillWatchingContinueText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStillWatchingExit}
                style={styles.stillWatchingExit}
              >
                <Text style={styles.stillWatchingExitText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <UnlockModal
        visible={showUnlockModal}
        episode={episode}
        onClose={() => setShowUnlockModal(false)}
        onConfirm={() => unlockMutation.mutate()}
        isLoading={unlockMutation.isPending}
        error={unlockMutation.error instanceof Error ? unlockMutation.error.message : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 12,
  },
  lockedTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  lockedCost: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 24,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  notFoundText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },

  // Autoplay overlay
  autoplayOverlay: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 30,
  },
  autoplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  autoplayCountdownCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoplayCountdownText: {
    color: '#a855f7',
    fontSize: 18,
    fontWeight: '700',
  },
  autoplayInfo: {
    flex: 1,
    minWidth: 0,
  },
  autoplayLabel: {
    color: '#9ca3af',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  autoplayTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  autoplayCancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  autoplayCancelText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },

  // Still watching overlay
  stillWatchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  stillWatchingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 300,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stillWatchingTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stillWatchingSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  stillWatchingButtons: {
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  stillWatchingContinue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
  },
  stillWatchingContinueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  stillWatchingExit: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
  },
  stillWatchingExitText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
});
