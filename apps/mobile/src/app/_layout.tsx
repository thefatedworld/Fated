import { useEffect, useState, useCallback } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { initAuthClient } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import '../global.css';

SplashScreen.preventAutoHideAsync();
initAuthClient();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ICON_SIZE = SCREEN_W * 0.38;
const RING_BASE = Math.max(SCREEN_W, SCREEN_H) * 0.15;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.92);
  const ringScale = useSharedValue(0.1);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync();

    // 300-1400ms: ring expands outward from center
    ringOpacity.value = withDelay(300, withSequence(
      withTiming(0.85, { duration: 200 }),
      withDelay(700, withTiming(0, { duration: 300 })),
    ));
    ringScale.value = withDelay(300, withTiming(4.0, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    }));

    // 400-900ms: inner glow illumination
    glowOpacity.value = withDelay(400, withSequence(
      withTiming(0.15, { duration: 300 }),
      withDelay(400, withTiming(0, { duration: 400 })),
    ));

    // 500-1000ms: logo revealed as ring passes through
    iconOpacity.value = withDelay(500, withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    }));
    iconScale.value = withDelay(500, withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    }));

    // 1800-2200ms: fade out to app
    containerOpacity.value = withDelay(1800, withTiming(0, { duration: 400 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[splashStyles.container, containerAnimStyle]}>
      {/* Inner glow / illumination fill */}
      <Animated.View style={[splashStyles.glowFill, glowAnimStyle]} />

      {/* Expanding ring of light */}
      <Animated.View style={[splashStyles.ring, ringAnimStyle]} />

      {/* Logo - revealed by the ring */}
      <Animated.View style={[splashStyles.iconWrap, iconAnimStyle]}>
        <Image
          source={require('../../assets/icon.png')}
          style={splashStyles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadMe } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading || showSplash) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router, showSplash]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash || isLoading) {
    return <AnimatedSplash onFinish={handleSplashFinish} />;
  }

  return <>{children}</>;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.22,
    overflow: 'hidden',
    zIndex: 10,
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  ring: {
    position: 'absolute',
    width: RING_BASE,
    height: RING_BASE,
    borderRadius: RING_BASE / 2,
    borderWidth: 3,
    borderColor: 'rgba(212,175,55,0.8)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 15,
  },
  glowFill: {
    position: 'absolute',
    width: RING_BASE,
    height: RING_BASE,
    borderRadius: RING_BASE / 2,
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="series/[id]"
            options={{
              headerShown: true,
              headerTitle: '',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="community/[seriesId]"
            options={{
              headerShown: true,
              headerTitle: 'Community',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="community/thread/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Thread',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="community/new-thread"
            options={{
              headerShown: true,
              headerTitle: 'New Thread',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="wiki/[seriesId]"
            options={{
              headerShown: true,
              headerTitle: 'Wiki',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="wiki/page/[slug]"
            options={{
              headerShown: true,
              headerTitle: 'Wiki',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen
            name="author-dashboard"
            options={{
              headerShown: true,
              headerTitle: 'Author Dashboard',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#030712' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen name="episode/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="store" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </AuthGate>
    </QueryClientProvider>
  );
}

export const unstable_settings = {
  initialRouteName: '(auth)',
};
