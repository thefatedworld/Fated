import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Episode } from '@/lib/api-client';

interface Props {
  episode: Episode;
  onPress: () => void;
  isUnlocked?: boolean;
}

export default function EpisodeCard({ episode, onPress, isUnlocked }: Props) {
  const isLocked = episode.isGated && !isUnlocked;
  const duration = episode.durationSeconds
    ? `${Math.floor(episode.durationSeconds / 60)}m`
    : null;

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.8}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{episode.number}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{episode.title}</Text>
        <View style={styles.meta}>
          {duration && <Text style={styles.metaText}>{duration}</Text>}
          {episode.isGated && (
            <Text style={styles.tokenCost}>{episode.tokenCost} tokens</Text>
          )}
          {!episode.isGated && (
            <Text style={styles.freeTag}>Free</Text>
          )}
        </View>
      </View>

      {isLocked ? (
        <Ionicons name="lock-closed-outline" size={16} color="#7c3aed" />
      ) : (
        <Ionicons name="play-circle-outline" size={20} color="#a855f7" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    gap: 12,
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  metaText: {
    color: '#4b5563',
    fontSize: 12,
  },
  tokenCost: {
    color: '#a855f7',
    fontSize: 12,
  },
  freeTag: {
    color: '#22c55e',
    fontSize: 12,
  },
});
