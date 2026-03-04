import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, type Series } from '@/lib/api-client';

export default function CommunityTab() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: series, refetch } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const renderSeries = ({ item }: { item: Series }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/community/${item.id}`)}
    >
      {item.coverImageUrl ? (
        <Image source={{ uri: item.coverImageUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>{item.title[0]}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSub}>
          {item.genreTags?.[0] ?? 'General'}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          Join the discussion about {item.title}
        </Text>
      </View>
      <Text style={styles.chevron}>{'>'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community</Text>
      <Text style={styles.subheader}>Choose a series to join the conversation</Text>
      <FlatList
        data={series ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderSeries}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No series available yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subheader: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: 4,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 10,
  },
  cover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  placeholder: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#374151', fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cardSub: { color: '#a855f7', fontSize: 12, marginTop: 2 },
  cardDesc: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  chevron: { color: '#374151', fontSize: 18, marginLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
