import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initAuthClient } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import '../global.css';

initAuthClient();

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

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadMe } = useAuthStore();

  useEffect(() => {
    loadMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
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
