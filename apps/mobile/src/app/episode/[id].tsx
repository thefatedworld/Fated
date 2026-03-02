import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
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

  // Fetch playback URL once entitled
  useEffect(() => {
    if (!entitlement?.entitled || playbackRequested.current) return;
    playbackRequested.current = true;

    api.getPlaybackUrl(id).then(({ playbackUrl: url }) => {
      setPlaybackUrl(url);
      if (episode) analytics.playbackStart(id, episode.seriesId);
    }).catch(() => {
      // Will show error UI
    });
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
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!episode) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-center">Episode not found.</Text>
      </View>
    );
  }

  const isEntitled = entitlement?.entitled ?? false;

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/60 items-center justify-center"
      >
        <Ionicons name="close" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Video area */}
      <View className="w-full aspect-video bg-gray-950">
        {isEntitled && playbackUrl ? (
          <VideoPlayer
            uri={playbackUrl}
            onProgress={handlePlaybackProgress}
            onEnd={handlePlaybackEnd}
          />
        ) : isEntitled && !playbackUrl ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#a855f7" />
          </View>
        ) : (
          /* Locked state */
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="lock-closed" size={40} color="#7c3aed" />
            <Text className="text-white font-bold text-lg mt-4 text-center">{episode.title}</Text>
            {episode.isGated && (
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Unlock for {episode.tokenCost} tokens
              </Text>
            )}
            {episode.isGated ? (
              <TouchableOpacity
                onPress={() => setShowUnlockModal(true)}
                className="bg-purple-600 rounded-xl px-8 py-4 mt-6"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-base">
                  Unlock — {episode.tokenCost} Tokens
                </Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-gray-400 text-sm mt-4 text-center">
                This episode is not yet available.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Episode info */}
      <View className="px-4 pt-4">
        <Text className="text-white font-bold text-lg">{episode.title}</Text>
        {episode.description && (
          <Text className="text-gray-400 text-sm mt-1 leading-5">{episode.description}</Text>
        )}
        {episode.durationSeconds && (
          <Text className="text-gray-500 text-xs mt-2">
            {Math.floor(episode.durationSeconds / 60)}m {episode.durationSeconds % 60}s
          </Text>
        )}
      </View>

      {/* Unlock modal */}
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
