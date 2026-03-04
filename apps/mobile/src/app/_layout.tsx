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
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { initAuthClient } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import EmberField from '@/components/EmberField';
import '../global.css';

SplashScreen.preventAutoHideAsync();
initAuthClient();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOGO_WIDTH = SCREEN_W * 0.72;
const LOGO_HEIGHT = LOGO_WIDTH * (258 / 723);

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
  const logoOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Fade in text logo over ~1s
    logoOpacity.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });

    // After one ember orbit (~8s), fade out and finish
    containerOpacity.value = withDelay(8000, withTiming(0, { duration: 600 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[splashStyles.container, containerAnimStyle]}>
      <EmberField count={72} centerY={SCREEN_H * 0.42} />

      <Animated.View style={[splashStyles.logoWrap, logoAnimStyle]}>
        <Image
          source={require('../../assets/fated-text-logo.png')}
          style={splashStyles.logo}
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
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    zIndex: 10,
    alignItems: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
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
