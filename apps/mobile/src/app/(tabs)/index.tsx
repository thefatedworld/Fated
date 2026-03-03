import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import SeriesCard from '@/components/SeriesCard';
import SkeletonCard from '@/components/SkeletonCard';

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
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Failed to load series. Pull to retry.</Text>
      </View>
    );
  }

  const recIds = new Set(recs?.map((r) => r.seriesId) ?? []);
  const recommended = series?.filter((s) => recIds.has(s.id)) ?? [];
  const rest = series?.filter((s) => !recIds.has(s.id)) ?? [];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
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
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Browse</Text>
            <Text style={styles.heroSubtitle}>Romantasy, reimagined.</Text>
          </View>

          {/* Recommended row */}
          {recommended.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>For You</Text>
              <FlatList
                horizontal
                data={recommended}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => <SeriesCard series={item} horizontal />}
              />
            </View>
          )}

          {/* All series header */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>All Series</Text>
        </View>
      }
      data={rest.length > 0 ? rest : series ?? []}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <SeriesCard series={item} />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
    paddingHorizontal: 24,
  },
  listContent: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridRow: {
    paddingHorizontal: 12,
    gap: 12,
  },
  errorText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
  },
  skeletonHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  skeletonTitle: {
    width: 120,
    height: 28,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 180,
    height: 14,
    backgroundColor: '#111827',
    borderRadius: 6,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
});
