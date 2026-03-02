import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Router redirect handled by AuthGate in _layout.tsx
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo / brand */}
          <View className="mb-10 items-center">
            <Text className="text-4xl font-bold text-white tracking-tight">FatedWorld</Text>
            <Text className="text-gray-400 mt-2 text-sm">Romantasy streaming</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {error ? (
              <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                placeholder="Password"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-purple-600 rounded-xl px-4 py-4 items-center mt-2"
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View className="mt-8 flex-row justify-center gap-1">
            <Text className="text-gray-400 text-sm">Don&apos;t have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-purple-400 text-sm font-medium">Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
