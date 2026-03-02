import { View, Text, TouchableOpacity } from 'react-native';
import { useUiStore } from '@/store/ui.store';

interface Props {
  showRefresh?: boolean;
}

export default function TokenBalance({ showRefresh }: Props) {
  const { tokenBalance, refreshTokenBalance } = useUiStore();

  return (
    <View className="flex-row items-center bg-purple-900/40 rounded-full px-3 py-1.5 gap-1.5">
      <Text className="text-purple-300 text-xs font-semibold">
        {tokenBalance !== null ? tokenBalance.toLocaleString() : '—'}
      </Text>
      <Text className="text-purple-400 text-xs">tokens</Text>
      {showRefresh && (
        <TouchableOpacity onPress={refreshTokenBalance} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-purple-400 text-xs ml-1">↻</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
