import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CommunityThreadsScreen() {
  const { seriesId, seriesTitle } = useLocalSearchParams<{
    seriesId: string;
    seriesTitle?: string;
  }>();
  const router = useRouter();
  const [sort, setSort] = useState<'hot' | 'new'>('hot');

  const { data: threads, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['threads', seriesId, sort],
    queryFn: () => api.listThreads('series', seriesId),
    enabled: !!seriesId,
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{seriesTitle ?? 'Community'}</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/community/new-thread',
              params: { seriesId, seriesTitle },
            })
          }
          style={styles.newButton}
          activeOpacity={0.85}
        >
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortRow}>
        {(['hot', 'new'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSort(s)}
            style={[styles.sortPill, sort === s && styles.sortPillActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.sortText, sort === s && styles.sortTextActive]}
            >
              {s === 'hot' ? 'Popular' : 'Newest'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#a855f7" size="large" />
        </View>
      ) : (
        <FlatList
          data={threads ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#a855f7"
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.center, { paddingVertical: 80 }]}>
              <Text style={styles.emptyText}>No threads yet.</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation about this series!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/community/thread/[id]',
                  params: { id: item.id },
                })
              }
              style={styles.threadCard}
              activeOpacity={0.8}
            >
              <View style={styles.threadHeader}>
                {item.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>Pinned</Text>
                  </View>
                )}
                {item.isLocked && (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>Locked</Text>
                  </View>
                )}
              </View>
              <Text style={styles.threadTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.threadBody} numberOfLines={2}>
                {item.body}
              </Text>
              <View style={styles.threadMeta}>
                <Text style={styles.metaText}>
                  ▲ {item.voteCount}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  newButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  sortPillActive: { backgroundColor: 'rgba(124,58,237,0.2)' },
  sortText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  sortTextActive: { color: '#a855f7' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyText: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
  emptySubtext: {
    color: '#4b5563',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  threadCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 10,
  },
  threadHeader: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  pinnedBadge: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pinnedText: { color: '#eab308', fontSize: 10, fontWeight: '600' },
  lockedBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockedText: { color: '#ef4444', fontSize: 10, fontWeight: '600' },
  threadTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  threadBody: { color: '#9ca3af', fontSize: 13, lineHeight: 19 },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: { color: '#6b7280', fontSize: 12 },
  metaDot: { color: '#374151', fontSize: 12, marginHorizontal: 6 },
});
