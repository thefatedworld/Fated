import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, type Series } from '@/lib/api-client';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: allSeries } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.listSeries(),
  });

  const filtered = useMemo(() => {
    if (!allSeries) return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return allSeries.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.genreTags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [allSeries, query]);

  const genres = useMemo(() => {
    if (!allSeries) return [];
    const set = new Set<string>();
    allSeries.forEach((s) => s.genreTags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [allSeries]);

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const genreFiltered = useMemo(() => {
    if (!selectedGenre || !allSeries) return [];
    return allSeries.filter((s) => s.genreTags?.includes(selectedGenre));
  }, [allSeries, selectedGenre]);

  const displayData = query.trim() ? filtered : genreFiltered;
  const showGenres = !query.trim();

  const renderSeries = ({ item }: { item: Series }) => (
    <TouchableOpacity
      onPress={() => router.push(`/series/${item.id}`)}
      style={styles.resultCard}
      activeOpacity={0.8}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultTags} numberOfLines={1}>
          {item.genreTags?.join(', ')}
        </Text>
        {item.description && (
          <Text style={styles.resultDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search series, genres..."
          placeholderTextColor="#4b5563"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setSelectedGenre(null);
          }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showGenres && (
        <View style={styles.genreSection}>
          <Text style={styles.sectionLabel}>Browse by Genre</Text>
          <View style={styles.genreGrid}>
            {genres.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() =>
                  setSelectedGenre(selectedGenre === g ? null : g)
                }
                style={[
                  styles.genrePill,
                  selectedGenre === g && styles.genrePillActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genreText,
                    selectedGenre === g && styles.genreTextActive,
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {(query.trim() || selectedGenre) && (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.center, { paddingVertical: 60 }]}>
              <Text style={styles.emptyText}>
                {query.trim()
                  ? `No results for "${query}"`
                  : 'No series in this genre'}
              </Text>
            </View>
          }
          renderItem={renderSeries}
        />
      )}

      {!query.trim() && !selectedGenre && (
        <View style={[styles.center, { paddingVertical: 80 }]}>
          <Text style={styles.hintText}>
            Search for a series or tap a genre
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    padding: 4,
  },
  clearText: { color: '#6b7280', fontSize: 14 },
  genreSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genrePill: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  genrePillActive: { backgroundColor: 'rgba(124,58,237,0.2)' },
  genreText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  genreTextActive: { color: '#a855f7' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  resultCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultContent: { flex: 1 },
  resultTitle: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  resultTags: { color: '#a855f7', fontSize: 12, marginTop: 2 },
  resultDesc: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  chevron: { color: '#374151', fontSize: 18, marginLeft: 12 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  hintText: { color: '#4b5563', fontSize: 14 },
});
