import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUiStore } from '@/store/ui.store';
import { View, Text } from 'react-native';
import { useEffect } from 'react';

export default function TabsLayout() {
  const refreshTokenBalance = useUiStore((s) => s.refreshTokenBalance);

  useEffect(() => {
    refreshTokenBalance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerRight: () => <TokenBalancePill />,
        }}
      />
    </Tabs>
  );
}

function TokenBalancePill() {
  const balance = useUiStore((s) => s.tokenBalance);
  if (balance === null) return null;
  return (
    <View className="flex-row items-center bg-purple-900/40 rounded-full px-3 py-1 mr-4">
      <Text className="text-purple-300 text-xs font-semibold">{balance} tokens</Text>
    </View>
  );
}
