import { useEffect, useState, useCallback } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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

const { width: SCREEN_W } = Dimensions.get('window');
const ICON_SIZE = SCREEN_W * 0.38;
const RING_SIZE = ICON_SIZE * 1.6;

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
  const iconScale = useSharedValue(0.6);
  const iconOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.3);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const containerOpacity = useSharedValue(1);
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    SplashScreen.hideAsync();

    iconOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    iconScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    ringOpacity.value = withDelay(300, withSequence(
      withTiming(0.7, { duration: 500 }),
      withDelay(800, withTiming(0, { duration: 400 })),
    ));
    ringScale.value = withDelay(300, withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.cubic) }));

    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(600, withSpring(0, { damping: 14, stiffness: 100 }));

    shimmerPosition.value = withDelay(400, withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }));

    containerOpacity.value = withDelay(2200, withTiming(0, { duration: 400 }, (finished) => {
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

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[splashStyles.container, containerAnimStyle]}>
      <View style={splashStyles.centerWrap}>
        <Animated.View style={[splashStyles.ring, ringAnimStyle]} />
        <Animated.View style={[splashStyles.iconWrap, iconAnimStyle]}>
          <Image
            source={require('../../assets/icon.png')}
            style={splashStyles.icon}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      <Animated.View style={titleAnimStyle}>
        <Text style={splashStyles.title}>FATEDWORLD</Text>
        <View style={splashStyles.subtitleLine} />
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
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.5)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.22,
    overflow: 'hidden',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#d4af37',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(212,175,55,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitleLine: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.3)',
    alignSelf: 'center',
    marginTop: 12,
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
