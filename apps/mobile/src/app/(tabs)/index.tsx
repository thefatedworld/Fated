import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, Series } from '@/lib/api-client';
import SeriesCard from '@/components/SeriesCard';

export default function BrowseScreen() {
  const { data: series, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const { data: recs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.getRecommendations(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-6">
        <Text className="text-gray-400 text-center">Failed to load series. Pull to retry.</Text>
      </View>
    );
  }

  const recIds = new Set(recs?.map((r) => r.seriesId) ?? []);
  const recommended = series?.filter((s) => recIds.has(s.id)) ?? [];
  const rest = series?.filter((s) => !recIds.has(s.id)) ?? [];

  return (
    <FlatList
      className="flex-1 bg-gray-950"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#a855f7"
        />
      }
      ListHeaderComponent={
        <View>
          {/* Hero */}
          <View className="px-4 pt-6 pb-4">
            <Text className="text-2xl font-bold text-white">Browse</Text>
            <Text className="text-gray-400 text-sm mt-1">Romantasy, reimagined.</Text>
          </View>

          {/* Recommended row */}
          {recommended.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-300 px-4 mb-3">For You</Text>
              <FlatList
                horizontal
                data={recommended}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                renderItem={({ item }) => <SeriesCard series={item} horizontal />}
              />
            </View>
          )}

          {/* All series header */}
          <Text className="text-sm font-semibold text-gray-300 px-4 mb-3">All Series</Text>
        </View>
      }
      data={rest.length > 0 ? rest : series ?? []}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
      renderItem={({ item }) => (
        <View className="flex-1">
          <SeriesCard series={item} />
        </View>
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
    />
  );
}
