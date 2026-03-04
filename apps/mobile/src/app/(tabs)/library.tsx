import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, type Series } from '@/lib/api-client';
import { useRouter } from 'expo-router';

export default function LibraryScreen() {
  const router = useRouter();

  const { data: entitlements, isLoading: entLoading, refetch: refetchEnt, isRefetching: entRefetching } = useQuery({
    queryKey: ['my-entitlements'],
    queryFn: () => api.getMyEntitlements(),
  });

  const { data: allSeries, isLoading: seriesLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const isLoading = entLoading || seriesLoading;
  const isRefetching = entRefetching;

  const unlockedSeriesIds = new Set(
    (entitlements ?? []).map((e) => e.seriesId).filter(Boolean),
  );

  const librarySeries: Series[] = (allSeries ?? []).filter((s) =>
    unlockedSeriesIds.has(s.id),
  );

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
        <RefreshControl refreshing={isRefetching} onRefresh={refetchEnt} tintColor="#a855f7" />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>My Library</Text>
          <Text style={styles.subtitle}>
            {librarySeries.length > 0
              ? `${librarySeries.length} series with unlocked episodes`
              : 'Your unlocked episodes'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={[styles.center, { paddingVertical: 80 }]}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>No unlocked episodes yet.</Text>
          <Text style={styles.emptySubtext}>
            Browse series and unlock episodes to build your library.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.browseButton}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>Browse Series</Text>
          </TouchableOpacity>
        </View>
      }
      data={librarySeries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/series/${item.id}`)}
          style={styles.listItem}
          activeOpacity={0.8}
        >
          {item.coverImageUrl ? (
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={styles.thumbText}>{item.title[0]}</Text>
            </View>
          )}
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>{item.title}</Text>
            <Text style={styles.listItemSub}>
              {item.genreTags?.slice(0, 2).join(', ')}
            </Text>
            <Text style={styles.unlockCount}>
              {(entitlements ?? []).filter((e) => e.seriesId === item.id).length} episodes unlocked
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 32, paddingHorizontal: 16 },
  header: { paddingTop: 20, paddingBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    fontSize: 14,
    paddingHorizontal: 24,
  },
  browseButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  listItem: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#374151', fontSize: 20, fontWeight: '700' },
  listItemContent: { flex: 1 },
  listItemTitle: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  listItemSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  unlockCount: { color: '#a855f7', fontSize: 11, marginTop: 2, fontWeight: '500' },
  chevron: { color: '#374151', fontSize: 18 },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderTopColor: 'transparent',
  },
});
