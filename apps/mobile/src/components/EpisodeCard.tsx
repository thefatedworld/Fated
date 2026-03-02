import { View, Text, TouchableOpacity } from 'react-native';
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
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center bg-gray-900 rounded-xl border border-gray-800 px-4 py-4 mb-2 gap-3"
      activeOpacity={0.8}
    >
      {/* Episode number */}
      <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
        <Text className="text-gray-400 text-xs font-semibold">{episode.number}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-white font-medium text-sm" numberOfLines={1}>{episode.title}</Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {duration && (
            <Text className="text-gray-500 text-xs">{duration}</Text>
          )}
          {episode.isGated && (
            <View className="flex-row items-center gap-1">
              <Text className="text-purple-400 text-xs">{episode.tokenCost} tokens</Text>
            </View>
          )}
          {!episode.isGated && (
            <Text className="text-green-400 text-xs">Free</Text>
          )}
        </View>
      </View>

      {/* Lock / play icon */}
      {isLocked ? (
        <Ionicons name="lock-closed-outline" size={16} color="#7c3aed" />
      ) : (
        <Ionicons name="play-circle-outline" size={20} color="#a855f7" />
      )}
    </TouchableOpacity>
  );
}
