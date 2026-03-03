import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useRouter } from 'expo-router';

export default function LibraryScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-entitlements'],
    queryFn: async () => {
      const series = await api.listSeries();
      return series;
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.spinner} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#a855f7" />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>My Library</Text>
          <Text style={styles.subtitle}>Your unlocked episodes</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={[styles.center, { paddingVertical: 80 }]}>
          <Text style={styles.emptyText}>No unlocked episodes yet.</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.browseButton}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>Browse Series</Text>
          </TouchableOpacity>
        </View>
      }
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/series/${item.id}`)}
          style={styles.listItem}
          activeOpacity={0.8}
        >
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>{item.title}</Text>
            <Text style={styles.listItemSub}>
              {item.genreTags?.slice(0, 2).join(', ')}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  browseButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  listItem: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  listItemSub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: '#374151',
    fontSize: 18,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderTopColor: 'transparent',
  },
});
