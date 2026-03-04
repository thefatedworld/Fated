import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, type Thread, type Series } from '@/lib/api-client';

type Tab = 'feed' | 'trending' | 'wiki';

const TABS: { key: Tab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'trending', label: 'Trending' },
  { key: 'wiki', label: 'Wiki' },
];

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ThreadCard({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardTitle}>{thread.title}</Text>
      <Text style={styles.cardBody} numberOfLines={2}>
        {thread.body}
      </Text>

      {thread.seriesId && (
        <View style={styles.seriesBadge}>
          <Text style={styles.seriesBadgeText}>Series</Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>▲ {thread.voteCount}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{timeAgo(thread.createdAt)}</Text>
        {thread.isPinned && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.pinnedBadge}>PINNED</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function WikiSeriesCard({ series, onPress }: { series: Series; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardTitle}>{series.title}</Text>
      {series.description ? (
        <Text style={styles.cardBody} numberOfLines={2}>
          {series.description}
        </Text>
      ) : null}
      <View style={styles.wikiLinkRow}>
        {series.genreTags?.[0] && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreBadgeText}>{series.genreTags[0]}</Text>
          </View>
        )}
        <Text style={styles.wikiLink}>View Wiki →</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [refreshing, setRefreshing] = useState(false);

  const feedQuery = useQuery({
    queryKey: ['threads', 'new'],
    queryFn: () => api.listThreads(undefined, undefined, 'new'),
  });

  const trendingQuery = useQuery({
    queryKey: ['threads', 'hot'],
    queryFn: () => api.listThreads(undefined, undefined, 'hot'),
  });

  const seriesQuery = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'feed') await feedQuery.refetch();
    else if (activeTab === 'trending') await trendingQuery.refetch();
    else await seriesQuery.refetch();
    setRefreshing(false);
  }, [activeTab, feedQuery, trendingQuery, seriesQuery]);

  const renderThread = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push(`/community/thread/${item.id}`)}
      />
    ),
    [router],
  );

  const renderWikiSeries = useCallback(
    ({ item }: { item: Series }) => (
      <WikiSeriesCard
        series={item}
        onPress={() => router.push(`/wiki/${item.id}`)}
      />
    ),
    [router],
  );

  const emptyComponent = (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        {activeTab === 'wiki' ? 'No series available yet' : 'No threads yet'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community</Text>

      <View style={styles.segmentRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.segmentPill, activeTab === tab.key && styles.segmentPillActive]}
            activeOpacity={0.7}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[styles.segmentLabel, activeTab === tab.key && styles.segmentLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'feed' && (
        <FlatList
          data={feedQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
          ListEmptyComponent={emptyComponent}
        />
      )}

      {activeTab === 'trending' && (
        <FlatList
          data={trendingQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.trendingHeader}>🔥 Trending</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
          ListEmptyComponent={emptyComponent}
        />
      )}

      {activeTab === 'wiki' && (
        <FlatList
          data={seriesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderWikiSeries}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
          ListEmptyComponent={emptyComponent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  segmentPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  segmentPillActive: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  segmentLabelActive: {
    color: '#fff',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  seriesBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  seriesBadgeText: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  metaText: {
    color: '#6b7280',
    fontSize: 12,
  },
  metaDot: {
    color: '#374151',
    fontSize: 12,
  },
  pinnedBadge: {
    color: '#a855f7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  trendingHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  wikiLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  wikiLink: {
    color: '#a855f7',
    fontSize: 13,
    fontWeight: '600',
  },
  genreBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genreBadgeText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
