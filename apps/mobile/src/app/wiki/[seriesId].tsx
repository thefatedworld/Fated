import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const TAG_COLORS: Record<string, string> = {
  characters: '#3b82f6',
  lore: '#8b5cf6',
  episodes: '#10b981',
  powers: '#f59e0b',
  theories: '#ef4444',
  guide: '#6366f1',
  worldbuilding: '#ec4899',
  magic: '#f59e0b',
  speculation: '#f97316',
  community: '#06b6d4',
};

export default function WikiListScreen() {
  const { seriesId, seriesTitle } = useLocalSearchParams<{
    seriesId: string;
    seriesTitle?: string;
  }>();
  const router = useRouter();

  const { data: pages, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wiki-pages', seriesId],
    queryFn: () => api.listWikiPages(seriesId),
    enabled: !!seriesId,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pages ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#a855f7"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Wiki</Text>
            {seriesTitle && (
              <Text style={styles.subtitle}>{seriesTitle} Lore & Guides</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.center, { paddingVertical: 80 }]}>
            <Text style={styles.emptyText}>No wiki pages yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/wiki/page/[slug]',
                params: { slug: item.slug },
              })
            }
            style={styles.pageCard}
            activeOpacity={0.8}
          >
            <Text style={styles.pageTitle}>{item.title}</Text>
            {item.tags?.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: `${TAG_COLORS[tag] ?? '#6b7280'}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: TAG_COLORS[tag] ?? '#6b7280' },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: { color: '#6b7280', fontSize: 15 },
  pageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'column',
  },
  pageTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
    paddingRight: 24,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    color: '#374151',
    fontSize: 18,
    position: 'absolute',
    right: 16,
    top: 16,
  },
});
