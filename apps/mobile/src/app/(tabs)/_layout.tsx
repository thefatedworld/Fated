import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUiStore } from '@/store/ui.store';
import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';

export default function TabsLayout() {
  const refreshTokenBalance = useUiStore((s) => s.refreshTokenBalance);

  useEffect(() => {
    refreshTokenBalance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#030712' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#030712',
          borderTopColor: '#1f293720',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 85,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#4b5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
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
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
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
    <View style={pillStyles.container}>
      <Text style={pillStyles.text}>{balance} tokens</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 16,
  },
  text: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
  },
});
