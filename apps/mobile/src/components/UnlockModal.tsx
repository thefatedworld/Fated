import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Episode } from '@/lib/api-client';
import { useUiStore } from '@/store/ui.store';

interface Props {
  visible: boolean;
  episode: Episode;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function UnlockModal({ visible, episode, onClose, onConfirm, isLoading, error }: Props) {
  const router = useRouter();
  const tokenBalance = useUiStore((s) => s.tokenBalance);
  const hasEnoughTokens = tokenBalance !== null && tokenBalance >= episode.tokenCost;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10">
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-gray-700 self-center mb-6" />

          {/* Icon */}
          <View className="w-16 h-16 rounded-full bg-purple-900/40 border border-purple-700/40 self-center items-center justify-center mb-4">
            <Ionicons name="lock-open" size={28} color="#a855f7" />
          </View>

          <Text className="text-white text-xl font-bold text-center">{episode.title}</Text>
          <Text className="text-gray-400 text-sm text-center mt-1">
            Unlock this episode permanently
          </Text>

          {/* Cost row */}
          <View className="flex-row items-center justify-between bg-gray-800 rounded-xl px-4 py-4 mt-6">
            <Text className="text-gray-300 text-sm">Cost</Text>
            <Text className="text-white font-bold">{episode.tokenCost} tokens</Text>
          </View>

          <View className="flex-row items-center justify-between px-1 mt-2">
            <Text className="text-gray-500 text-xs">Your balance</Text>
            <Text className={`text-xs font-medium ${hasEnoughTokens ? 'text-green-400' : 'text-red-400'}`}>
              {tokenBalance !== null ? `${tokenBalance} tokens` : '…'}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mt-4">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Not enough tokens — link to store */}
          {!hasEnoughTokens && tokenBalance !== null && (
            <TouchableOpacity
              onPress={() => { onClose(); router.push('/store'); }}
              className="mt-3 items-center"
            >
              <Text className="text-yellow-400 text-xs text-center">
                You need {episode.tokenCost - tokenBalance} more tokens.
              </Text>
              <Text className="text-purple-400 text-sm font-semibold mt-1">
                Buy Tokens
              </Text>
            </TouchableOpacity>
          )}

          {/* Actions */}
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isLoading || !hasEnoughTokens}
            className="bg-purple-600 rounded-xl px-4 py-4 items-center mt-6"
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Unlock — {episode.tokenCost} Tokens
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            disabled={isLoading}
            className="items-center mt-4 py-2"
          >
            <Text className="text-gray-400 text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
