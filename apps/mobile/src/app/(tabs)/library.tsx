import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Series, type Entitlement } from '@/lib/api-client';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

const CARD_WIDTH = 130;

export default function LibraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: watchlist,
    isLoading: wlLoading,
    isRefetching: wlRefetching,
  } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.getWatchlist(),
  });

  const {
    data: entitlements,
    isLoading: entLoading,
    isRefetching: entRefetching,
  } = useQuery({
    queryKey: ['my-entitlements'],
    queryFn: () => api.getMyEntitlements(),
  });

  const { data: allSeries, isLoading: seriesLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const isLoading = wlLoading || entLoading || seriesLoading;
  const isRefetching = wlRefetching || entRefetching;

  const unlockedSeriesIds = new Set(
    (entitlements ?? []).map((e: Entitlement) => e.seriesId).filter(Boolean),
  );

  const librarySeries: Series[] = (allSeries ?? []).filter((s: Series) =>
    unlockedSeriesIds.has(s.id),
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['my-entitlements'] });
    queryClient.invalidateQueries({ queryKey: ['series'] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.spinner} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#a855f7" />
      }
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>My Library</Text>
      </View>

      {/* Section 1: My Watchlist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>♡ My Watchlist</Text>
        {(watchlist ?? []).length > 0 ? (
          <FlatList
            horizontal
            data={watchlist}
            keyExtractor={(item: Series) => `wl-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }: { item: Series }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/series/${item.id}`)}
                style={styles.watchlistCard}
              >
                {item.coverImageUrl ? (
                  <Image
                    source={{ uri: item.coverImageUrl }}
                    style={styles.watchlistCover}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.watchlistCover, styles.coverPlaceholder]}>
                    <Text style={styles.coverPlaceholderText}>
                      {item.title[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.watchlistCardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.genreTags?.[0] && (
                  <Text style={styles.watchlistCardGenre}>{item.genreTags[0]}</Text>
                )}
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyIcon}>♡</Text>
            <Text style={styles.emptyText}>
              Save series to your watchlist by tapping + List
            </Text>
          </View>
        )}
      </View>

      {/* Section 2: Unlocked Episodes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔓 Unlocked Episodes</Text>
        {librarySeries.length > 0 ? (
          <View style={styles.unlockedList}>
            {librarySeries.map((item: Series) => (
              <TouchableOpacity
                key={item.id}
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
                    {(entitlements ?? []).filter((e: Entitlement) => e.seriesId === item.id).length}{' '}
                    episodes unlocked
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyText}>No unlocked episodes yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { alignItems: 'center', justifyContent: 'center' },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  watchlistCard: {
    width: CARD_WIDTH,
  },
  watchlistCover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.45,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  coverPlaceholderText: {
    color: '#374151',
    fontSize: 32,
    fontWeight: '700',
  },
  watchlistCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 17,
  },
  watchlistCardGenre: {
    color: '#a855f7',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  unlockedList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listItem: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
    marginHorizontal: 16,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 10,
    color: '#374151',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
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
