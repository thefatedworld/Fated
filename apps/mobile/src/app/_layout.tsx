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
  const iconScale = useSharedValue(0.85);
  const flareX = useSharedValue(-SCREEN_W);
  const flareOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync();

    // 0-400ms: black hold
    // 400-1200ms: flare sweeps left to right
    flareOpacity.value = withDelay(400, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(600, withTiming(0, { duration: 200 })),
    ));
    flareX.value = withDelay(400, withTiming(SCREEN_W, {
      duration: 800,
      easing: Easing.inOut(Easing.cubic),
    }));

    // 500-900ms: logo fades in as flare crosses center
    iconOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    iconScale.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    // 1800-2200ms: entire container fades out
    containerOpacity.value = withDelay(1800, withTiming(0, { duration: 400 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const flareAnimStyle = useAnimatedStyle(() => ({
    opacity: flareOpacity.value,
    transform: [{ translateX: flareX.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[splashStyles.container, containerAnimStyle]}>
      {/* Logo */}
      <Animated.View style={[splashStyles.iconWrap, iconAnimStyle]}>
        <Image
          source={require('../../assets/icon.png')}
          style={splashStyles.icon}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Lens flare / screen wipe */}
      <Animated.View style={[splashStyles.flare, flareAnimStyle]}>
        <View style={splashStyles.flareCore} />
        <View style={splashStyles.flareGlowInner} />
        <View style={splashStyles.flareGlowOuter} />
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
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  flare: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flareCore: {
    position: 'absolute',
    width: 3,
    height: SCREEN_H,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  flareGlowInner: {
    position: 'absolute',
    width: 30,
    height: SCREEN_H,
    backgroundColor: 'rgba(212,175,55,0.25)',
  },
  flareGlowOuter: {
    position: 'absolute',
    width: 60,
    height: SCREEN_H,
    backgroundColor: 'rgba(212,175,55,0.08)',
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
