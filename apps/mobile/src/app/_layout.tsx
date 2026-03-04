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
  withRepeat,
  runOnJS,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { initAuthClient } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import '../global.css';

SplashScreen.preventAutoHideAsync();
initAuthClient();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ICON_SIZE = SCREEN_W * 0.42;
const ORBIT_RADIUS = SCREEN_W * 0.24;
const TRAIL_COUNT = 10;

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
  const iconScale = useSharedValue(0.88);
  const cometAngle = useSharedValue(-Math.PI / 2);
  const cometOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const starfieldOpacity = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Fade in starfield background
    starfieldOpacity.value = withTiming(0.35, { duration: 600 });

    // Start comet orbiting (1.5 rotations over 2.4s)
    cometOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
    cometAngle.value = withDelay(300,
      withTiming(-Math.PI / 2 + Math.PI * 3, {
        duration: 2400,
        easing: Easing.inOut(Easing.cubic),
      }),
    );

    // Glow follows comet
    glowOpacity.value = withDelay(400, withTiming(0.5, { duration: 400 }));

    // Logo fades in after first quarter orbit
    iconOpacity.value = withDelay(700, withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    }));
    iconScale.value = withDelay(700, withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    }));

    // Fade out comet near end
    cometOpacity.value = withDelay(2200, withTiming(0, { duration: 500 }));
    glowOpacity.value = withDelay(2200, withTiming(0, { duration: 500 }));

    // Fade out everything
    containerOpacity.value = withDelay(2800, withTiming(0, { duration: 500 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cometX = useDerivedValue(() => Math.cos(cometAngle.value) * ORBIT_RADIUS);
  const cometY = useDerivedValue(() => Math.sin(cometAngle.value) * ORBIT_RADIUS);

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const starfieldAnimStyle = useAnimatedStyle(() => ({
    opacity: starfieldOpacity.value,
  }));

  // Directional glow that follows the comet
  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * cometOpacity.value,
    transform: [
      { translateX: cometX.value * 0.5 },
      { translateY: cometY.value * 0.5 },
    ],
  }));

  // Generate trail configs (each one is slightly behind the lead)
  const trailElements = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    trailElements.push(
      <CometTrailDot
        key={i}
        index={i}
        cometAngle={cometAngle}
        cometOpacity={cometOpacity}
      />,
    );
  }

  return (
    <Animated.View style={[splashStyles.container, containerAnimStyle]}>
      {/* Starfield background */}
      <Animated.View style={[splashStyles.starfieldWrap, starfieldAnimStyle]}>
        <Image
          source={require('../../assets/icon.png')}
          style={splashStyles.starfield}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Directional glow */}
      <Animated.View style={[splashStyles.glow, glowAnimStyle]} />

      {/* Comet trail */}
      {trailElements}

      {/* Logo */}
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

function CometTrailDot({
  index,
  cometAngle,
  cometOpacity,
}: {
  index: number;
  cometAngle: Animated.SharedValue<number>;
  cometOpacity: Animated.SharedValue<number>;
}) {
  const angleOffset = index * 0.12;
  const opacityFactor = 1 - index / TRAIL_COUNT;
  const sizeFactor = 1 - index * 0.07;
  const baseSize = 8;

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = cometAngle.value - angleOffset;
    const x = Math.cos(angle) * ORBIT_RADIUS;
    const y = Math.sin(angle) * ORBIT_RADIUS;
    const size = baseSize * sizeFactor;
    return {
      position: 'absolute',
      left: SCREEN_W / 2 - size / 2 + x,
      top: SCREEN_H / 2 - size / 2 + y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: index === 0 ? '#fff8e1' : '#d4af37',
      opacity: cometOpacity.value * opacityFactor * (index === 0 ? 1 : 0.7),
      shadowColor: index === 0 ? '#ffffff' : '#d4af37',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: index === 0 ? 1 : 0.6,
      shadowRadius: index === 0 ? 20 : 10 * opacityFactor,
    };
  });

  return <Animated.View style={animStyle} />;
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
  starfieldWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  starfield: {
    width: SCREEN_W,
    height: SCREEN_H,
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
  glow: {
    position: 'absolute',
    width: ICON_SIZE * 1.8,
    height: ICON_SIZE * 1.8,
    borderRadius: ICON_SIZE * 0.9,
    backgroundColor: 'rgba(212,175,55,0.08)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    zIndex: 5,
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
