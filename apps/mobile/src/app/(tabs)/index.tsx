import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, type Series } from '@/lib/api-client';
import SeriesCard from '@/components/SeriesCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

const GENRES = [
  { label: 'All', emoji: '✨' },
  { label: 'Angel', emoji: '👼' },
  { label: 'Demon', emoji: '😈' },
  { label: 'Dragon', emoji: '🐉' },
  { label: 'Fae', emoji: '🧚' },
  { label: 'Mermaid', emoji: '🧜' },
  { label: 'Shifter', emoji: '🐾' },
  { label: 'Vampire', emoji: '🧛' },
  { label: 'Werewolf', emoji: '🐺' },
  { label: 'Witch', emoji: '🔮' },
];

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const heroRef = useRef<FlatList>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [activeGenre, setActiveGenre] = useState('All');
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());

  const { data: series, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const addToWatchlist = useMutation({
    mutationFn: (seriesId: string) => api.addToWatchlist(seriesId),
    onSuccess: (_data, seriesId) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setListedIds((prev) => new Set(prev).add(seriesId));
      setTimeout(() => {
        setListedIds((prev) => {
          const next = new Set(prev);
          next.delete(seriesId);
          return next;
        });
      }, 2000);
    },
  });

  const heroSeries = series?.slice(0, 5) ?? [];
  const trending = series ?? [];
  const top10 = [...(series ?? [])].reverse().slice(0, 10);

  const filteredSeries =
    activeGenre === 'All'
      ? series ?? []
      : (series ?? []).filter((s) =>
          s.genreTags?.some((t) => t.toLowerCase() === activeGenre.toLowerCase()),
        );

  useEffect(() => {
    if (heroSeries.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => {
        const next = (prev + 1) % heroSeries.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSeries.length]);

  const onHeroScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      setHeroIdx(idx);
    },
    [],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#a855f7" />
      }
    >
      {/* Hero Carousel */}
      <View style={styles.heroWrap}>
        <FlatList
          ref={heroRef}
          data={heroSeries}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHeroScroll}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/series/${item.id}`)}
              style={styles.heroSlide}
            >
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroImage, { backgroundColor: '#111827' }]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(3,7,18,0.85)', '#030712']}
                style={styles.heroGradient}
              />
              <View style={styles.heroContent}>
                {item.genreTags?.[0] && (
                  <View style={styles.heroGenrePill}>
                    <Text style={styles.heroGenreText}>{item.genreTags[0]}</Text>
                  </View>
                )}
                <Text style={styles.heroTitle}>{item.title}</Text>
                <View style={styles.heroMeta}>
                  <Text style={styles.heroStars}>★★★★★</Text>
                  <Text style={styles.heroRating}>5.0</Text>
                  <Text style={styles.heroEps}>
                    {(item as any)._count?.episodes ?? 2} eps
                  </Text>
                </View>
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.heroBtns}>
                  <TouchableOpacity
                    style={styles.watchBtn}
                    onPress={() => router.push(`/series/${item.id}`)}
                  >
                    <Text style={styles.watchBtnIcon}>▶</Text>
                    <Text style={styles.watchBtnText}>Watch</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.listBtn, listedIds.has(item.id) && styles.listBtnActive]}
                    onPress={() => addToWatchlist.mutate(item.id)}
                    disabled={listedIds.has(item.id)}
                  >
                    <Text style={[styles.listBtnText, listedIds.has(item.id) && styles.listBtnTextActive]}>
                      {listedIds.has(item.id) ? '✓ Listed' : '+ List'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
        {/* Dots */}
        <View style={styles.dots}>
          {heroSeries.map((_, i) => (
            <View key={i} style={[styles.dot, i === heroIdx && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Genre Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
      >
        {GENRES.map((g) => (
          <TouchableOpacity
            key={g.label}
            style={[styles.genrePill, activeGenre === g.label && styles.genrePillActive]}
            onPress={() => setActiveGenre(g.label)}
            activeOpacity={0.8}
          >
            <Text style={styles.genreEmoji}>{g.emoji}</Text>
            <Text style={[styles.genreLabel, activeGenre === g.label && styles.genreLabelActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trending Now */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
        <FlatList
          horizontal
          data={filteredSeries.length > 0 ? filteredSeries : trending}
          keyExtractor={(item) => `trend-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => <SeriesCard series={item} horizontal />}
        />
      </View>

      {/* Top 10 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Top 10</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All {'>'}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={top10}
          keyExtractor={(item) => `top-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => (
            <SeriesCard series={item} horizontal rank={index + 1} />
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#a855f7',
    borderTopColor: 'transparent',
  },
  heroWrap: { position: 'relative' },
  heroSlide: { width: SCREEN_W, height: 420, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroGenrePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  heroGenreText: { color: '#c084fc', fontSize: 11, fontWeight: '600' },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroStars: { color: '#eab308', fontSize: 12 },
  heroRating: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroEps: { color: '#9ca3af', fontSize: 12 },
  heroDesc: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  watchBtnIcon: { color: '#fff', fontSize: 12 },
  watchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  listBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listBtnActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  listBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  listBtnTextActive: { color: '#a855f7' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  dotActive: { backgroundColor: '#a855f7', width: 20 },
  genreRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  genrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 5,
  },
  genrePillActive: { backgroundColor: 'rgba(124,58,237,0.25)' },
  genreEmoji: { fontSize: 13 },
  genreLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  genreLabelActive: { color: '#a855f7' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: { color: '#a855f7', fontSize: 13, fontWeight: '500' },
  hList: { paddingHorizontal: 16, gap: 12 },
});
