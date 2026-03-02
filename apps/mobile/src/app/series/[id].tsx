import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import EpisodeCard from '@/components/EpisodeCard';
import { analytics } from '@/lib/analytics';
import { useEffect } from 'react';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', id],
    queryFn: () => api.getSeries(id),
    enabled: !!id,
  });

  const { data: episodes, isLoading: epsLoading } = useQuery({
    queryKey: ['episodes', id],
    queryFn: () => api.listEpisodes(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (series) analytics.seriesView(series.id);
  }, [series?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (seriesLoading || epsLoading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!series) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-6">
        <Text className="text-gray-400 text-center">Series not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Cover */}
      {series.coverImageUrl ? (
        <Image
          source={{ uri: series.coverImageUrl }}
          className="w-full h-56"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-56 bg-gray-800 items-center justify-center">
          <Text className="text-gray-600 text-4xl font-bold">
            {series.title[0].toUpperCase()}
          </Text>
        </View>
      )}

      {/* Header info */}
      <View className="px-4 pt-5 pb-2">
        <Text className="text-2xl font-bold text-white">{series.title}</Text>
        {series.genreTags?.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {series.genreTags.map((tag) => (
              <View key={tag} className="bg-purple-900/40 rounded-full px-3 py-1">
                <Text className="text-purple-300 text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {series.description && (
          <Text className="text-gray-300 text-sm leading-6 mt-3">{series.description}</Text>
        )}
      </View>

      {/* Episodes */}
      <View className="px-4 mt-4">
        <Text className="text-sm font-semibold text-gray-300 mb-3">
          Episodes ({episodes?.length ?? 0})
        </Text>
        {(episodes ?? []).map((ep) => (
          <EpisodeCard
            key={ep.id}
            episode={ep}
            onPress={() => router.push(`/episode/${ep.id}`)}
          />
        ))}
        {episodes?.length === 0 && (
          <Text className="text-gray-500 text-sm text-center py-8">No episodes yet.</Text>
        )}
      </View>

      {/* Community link */}
      <View className="px-4 mt-6">
        <TouchableOpacity
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 flex-row items-center justify-between"
          activeOpacity={0.8}
        >
          <View>
            <Text className="text-white font-medium text-sm">Community</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Discuss this series</Text>
          </View>
          <Text className="text-gray-500 text-sm">›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
