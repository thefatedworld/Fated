import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, EntitlementCheck } from '@/lib/api-client';
import { useUiStore } from '@/store/ui.store';
import VideoPlayer from '@/components/VideoPlayer';
import UnlockModal from '@/components/UnlockModal';
import { analytics } from '@/lib/analytics';
import { Ionicons } from '@expo/vector-icons';

export default function EpisodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTokenBalance = useUiStore((s) => s.refreshTokenBalance);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const playbackRequested = useRef(false);

  const { data: episode, isLoading: epLoading } = useQuery({
    queryKey: ['episode', id],
    queryFn: () => api.getEpisode(id),
    enabled: !!id,
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

  useEffect(() => {
    if (!entitlement?.entitled || playbackRequested.current) return;
    playbackRequested.current = true;

    api.getPlaybackUrl(id).then(({ playbackUrl: url }) => {
      setPlaybackUrl(url);
      if (episode) analytics.playbackStart(id, episode.seriesId);
    }).catch(() => {});
  }, [entitlement?.entitled, id, episode]);

  const handlePlaybackProgress = useCallback(
    (positionSeconds: number, percentComplete: number) => {
      analytics.playbackProgress(id, positionSeconds, percentComplete);
    },
    [id],
  );

  const handlePlaybackEnd = useCallback(
    (watchDuration: number, completed: boolean) => {
      analytics.playbackEnd(id, watchDuration, completed);
    },
    [id],
  );

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Video area */}
      <View style={styles.videoArea}>
        {isEntitled && playbackUrl ? (
          <VideoPlayer
            uri={playbackUrl}
            onProgress={handlePlaybackProgress}
            onEnd={handlePlaybackEnd}
          />
        ) : isEntitled && !playbackUrl ? (
          <View style={[styles.videoArea, styles.center]}>
            <ActivityIndicator color="#a855f7" />
          </View>
        ) : (
          <View style={[styles.videoArea, styles.center, { paddingHorizontal: 32 }]}>
            <Ionicons name="lock-closed" size={40} color="#7c3aed" />
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
      </View>

      {/* Episode info */}
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle}>{episode.title}</Text>
        {episode.description && (
          <Text style={styles.episodeDescription}>{episode.description}</Text>
        )}
        {episode.durationSeconds && (
          <Text style={styles.episodeDuration}>
            {Math.floor(episode.durationSeconds / 60)}m {episode.durationSeconds % 60}s
          </Text>
        )}
      </View>

      <UnlockModal
        visible={showUnlockModal}
        episode={episode}
        onClose={() => setShowUnlockModal(false)}
        onConfirm={() => unlockMutation.mutate()}
        isLoading={unlockMutation.isPending}
        error={unlockMutation.error instanceof Error ? unlockMutation.error.message : undefined}
      />
    </SafeAreaView>
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
  videoArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#030712',
  },
  lockedTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
    marginTop: 16,
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
  episodeInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  episodeTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  episodeDescription: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  episodeDuration: {
    color: '#4b5563',
    fontSize: 12,
    marginTop: 8,
  },
  notFoundText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
});
