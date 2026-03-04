import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, type Series } from '@/lib/api-client';

const SCREEN_W = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 16 * 2 - CARD_GAP) / 2;

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

const GENRE_COLORS: Record<string, string> = {
  Vampire: '#dc2626',
  Werewolf: '#d97706',
  Fae: '#16a34a',
  Dragon: '#ea580c',
  Witch: '#7c3aed',
  Demon: '#e11d48',
  Mermaid: '#0891b2',
  Shifter: '#ca8a04',
  Angel: '#eab308',
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  const { data: allSeries } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const displayData = useMemo(() => {
    if (!allSeries) return [];
    let result = allSeries;

    if (activeGenre !== 'All') {
      result = result.filter((s) =>
        s.genreTags?.some((t) => t.toLowerCase() === activeGenre.toLowerCase()),
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.genreTags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [allSeries, query, activeGenre]);

  const renderCard = ({ item }: { item: Series }) => {
    const genre = item.genreTags?.[0] ?? '';
    const color = GENRE_COLORS[genre] ?? '#6b7280';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/series/${item.id}`)}
      >
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.placeholder]}>
            <Text style={styles.placeholderText}>{item.title[0]}</Text>
          </View>
        )}
        {genre ? (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{genre}</Text>
          </View>
        ) : null}
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.stars}>★★★★★</Text>
          <Text style={styles.eps}>{(item as any)._count?.episodes ?? 2} eps</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search series..."
          placeholderTextColor="#4b5563"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Genre pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
        style={{ flexGrow: 0 }}
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

      {/* Results grid */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {query.trim() ? `No results for "${query}"` : 'No series in this genre'}
            </Text>
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
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  clearBtn: { padding: 4 },
  clearText: { color: '#6b7280', fontSize: 14 },
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
  gridRow: { paddingHorizontal: 16, gap: CARD_GAP },
  gridContent: { paddingBottom: 32 },
  card: {
    width: CARD_W,
    marginBottom: 16,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#374151', fontSize: 32, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  stars: { color: '#eab308', fontSize: 11 },
  eps: { color: '#6b7280', fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
});
