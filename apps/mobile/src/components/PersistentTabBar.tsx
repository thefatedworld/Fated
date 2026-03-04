import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: '/(tabs)', label: 'Home', icon: 'home-outline' as const },
  { name: '/(tabs)/search', label: 'Search', icon: 'search-outline' as const },
  { name: '/(tabs)/library', label: 'My List', icon: 'heart-outline' as const },
  { name: '/(tabs)/community', label: 'Community', icon: 'people-outline' as const },
  { name: '/(tabs)/profile', label: 'Profile', icon: 'person-outline' as const },
];

export default function PersistentTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.name || pathname.startsWith(tab.name + '/');
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.replace(tab.name as any)}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? '#a855f7' : '#4b5563'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#030712',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f293720',
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 2,
  },
  labelActive: {
    color: '#a855f7',
  },
});
