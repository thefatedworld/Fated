import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Series } from '@/lib/api-client';

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

interface Props {
  series: Series;
  horizontal?: boolean;
  rank?: number;
}

export default function SeriesCard({ series, horizontal, rank }: Props) {
  const router = useRouter();
  const primaryGenre = series.genreTags?.[0] ?? '';
  const badgeColor = GENRE_COLORS[primaryGenre] ?? '#6b7280';
  const episodeCount = (series as any).episodeCount ?? (series as any)._count?.episodes;
  const rating = (series as any).avgRating ?? 5.0;

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/series/${series.id}`)}
        activeOpacity={0.8}
        style={styles.horizontalCard}
      >
        <View style={styles.imageWrap}>
          {series.coverImageUrl ? (
            <Image source={{ uri: series.coverImageUrl }} style={styles.horizontalImage} resizeMode="cover" />
          ) : (
            <View style={[styles.horizontalImage, styles.placeholder]}>
              <Text style={styles.placeholderText}>{series.title[0].toUpperCase()}</Text>
            </View>
          )}
          {primaryGenre ? (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{primaryGenre}</Text>
            </View>
          ) : null}
          {rank != null && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{series.title}</Text>
        <View style={styles.meta}>
          <Stars rating={rating} />
          {episodeCount != null && <Text style={styles.epCount}>{episodeCount} eps</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/series/${series.id}`)}
      activeOpacity={0.8}
      style={styles.gridCard}
    >
      <View style={styles.imageWrap}>
        {series.coverImageUrl ? (
          <Image source={{ uri: series.coverImageUrl }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.placeholder]}>
            <Text style={styles.placeholderTextLarge}>{series.title[0].toUpperCase()}</Text>
          </View>
        )}
        {primaryGenre ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{primaryGenre}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{series.title}</Text>
      <View style={styles.meta}>
        <Stars rating={rating} />
        {episodeCount != null && <Text style={styles.epCount}>{episodeCount} eps</Text>}
      </View>
    </TouchableOpacity>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}{half ? '★' : ''}{'☆'.repeat(empty)}
    </Text>
  );
}

const styles = StyleSheet.create({
  horizontalCard: { width: 140 },
  imageWrap: { position: 'relative' },
  horizontalImage: {
    width: 140,
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridCard: { flex: 1 },
  gridImage: {
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
  placeholderText: { color: '#374151', fontSize: 28, fontWeight: '700' },
  placeholderTextLarge: { color: '#374151', fontSize: 36, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  rankBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
    gap: 6,
  },
  stars: { color: '#eab308', fontSize: 11 },
  epCount: { color: '#6b7280', fontSize: 11 },
});
