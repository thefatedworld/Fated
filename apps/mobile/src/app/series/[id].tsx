import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import EpisodeCard from '@/components/EpisodeCard';
import { analytics } from '@/lib/analytics';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', id],
    queryFn: () => api.getSeries(id),
    enabled: !!id,
  });

  const { data: episodes, isLoading: epsLoading } = useQuery({
    queryKey: ['episodes', id],
    queryFn: () => api.listEpisodes(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (series) analytics.seriesView(series.id);
  }, [series?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (seriesLoading || epsLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!series) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Series not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Cover */}
      <View style={styles.coverContainer}>
        {series.coverImageUrl ? (
          <Image source={{ uri: series.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>{series.title[0].toUpperCase()}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', '#030712']}
          style={styles.coverGradient}
        />
      </View>

      {/* Header info */}
      <View style={styles.header}>
        <Text style={styles.title}>{series.title}</Text>
        {series.genreTags?.length > 0 && (
          <View style={styles.tagRow}>
            {series.genreTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {series.description && (
          <Text style={styles.description}>{series.description}</Text>
        )}
      </View>

      {/* Episodes */}
      <View style={styles.episodesSection}>
        <Text style={styles.sectionTitle}>
          Episodes ({episodes?.length ?? 0})
        </Text>
        {(episodes ?? []).map((ep) => (
          <EpisodeCard
            key={ep.id}
            episode={ep}
            onPress={() => router.push(`/episode/${ep.id}`)}
          />
        ))}
        {episodes?.length === 0 && (
          <Text style={styles.emptyText}>No episodes yet.</Text>
        )}
      </View>

      {/* Community link */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <TouchableOpacity style={styles.communityLink} activeOpacity={0.8}>
          <View>
            <Text style={styles.communityTitle}>Community</Text>
            <Text style={styles.communitySub}>Discuss this series</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 240,
  },
  coverPlaceholder: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: '#374151',
    fontSize: 48,
    fontWeight: '700',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  episodesSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  communityLink: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityTitle: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  communitySub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: '#374151',
    fontSize: 18,
  },
  errorText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
  },
});
