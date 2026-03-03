import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Series } from '@/lib/api-client';

interface Props {
  series: Series;
  horizontal?: boolean;
}

export default function SeriesCard({ series, horizontal }: Props) {
  const router = useRouter();

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/series/${series.id}`)}
        activeOpacity={0.8}
        style={styles.horizontalCard}
      >
        {series.coverImageUrl ? (
          <Image
            source={{ uri: series.coverImageUrl }}
            style={styles.horizontalImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.horizontalImage, styles.placeholder]}>
            <Text style={styles.placeholderText}>
              {series.title[0].toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={1}>
          {series.title}
        </Text>
        {series.genreTags?.[0] && (
          <Text style={styles.cardGenre} numberOfLines={1}>
            {series.genreTags[0]}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/series/${series.id}`)}
      activeOpacity={0.8}
      style={styles.gridCard}
    >
      {series.coverImageUrl ? (
        <Image
          source={{ uri: series.coverImageUrl }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.gridImage, styles.placeholder]}>
          <Text style={styles.placeholderTextLarge}>
            {series.title[0].toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {series.title}
      </Text>
      {series.genreTags?.[0] && (
        <Text style={styles.cardGenre} numberOfLines={1}>
          {series.genreTags[0]}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    width: 140,
  },
  horizontalImage: {
    width: 140,
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
  },
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
  placeholderText: {
    color: '#374151',
    fontSize: 28,
    fontWeight: '700',
  },
  placeholderTextLarge: {
    color: '#374151',
    fontSize: 36,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  cardGenre: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 2,
  },
});
