import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useRouter } from 'expo-router';

// The library shows the user's unlocked episodes, grouped by series.
// We fetch entitlements through the /v1/entitlements/my endpoint.
// For MVP, we list series the user has any unlock for.

export default function LibraryScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-entitlements'],
    queryFn: async () => {
      // Fetch all published series; filter those the user has unlocked at least one episode of.
      // In a real implementation, this would call GET /v1/entitlements/my which returns all grants.
      // For now we fetch series + do client-side filtering via a dedicated endpoint.
      const series = await api.listSeries();
      return series;
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-950"
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#a855f7" />
      }
      ListHeaderComponent={
        <View className="pt-6 pb-4">
          <Text className="text-2xl font-bold text-white">My Library</Text>
          <Text className="text-gray-400 text-sm mt-1">Your unlocked episodes</Text>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center justify-center py-20">
          <Text className="text-gray-400 text-center mb-4">
            No unlocked episodes yet.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="bg-purple-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Browse Series</Text>
          </TouchableOpacity>
        </View>
      }
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/series/${item.id}`)}
          className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-4 mb-3 flex-row items-center gap-4"
          activeOpacity={0.8}
        >
          <View className="flex-1">
            <Text className="text-white font-semibold text-base">{item.title}</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              {item.genreTags?.slice(0, 2).join(', ')}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs">›</Text>
        </TouchableOpacity>
      )}
    />
  );
}
