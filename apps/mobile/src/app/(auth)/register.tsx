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

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister() {
    if (!form.username || !form.email || !form.password) {
      setError('Username, email, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
          <View className="mb-10 items-center">
            <Text className="text-4xl font-bold text-white tracking-tight">FatedWorld</Text>
            <Text className="text-gray-400 mt-2 text-sm">Create your account</Text>
          </View>

          <View className="gap-4">
            {error ? (
              <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Username *</Text>
              <TextInput
                value={form.username}
                onChangeText={(v) => update('username', v)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="yourname"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Display Name</Text>
              <TextInput
                value={form.displayName}
                onChangeText={(v) => update('displayName', v)}
                placeholder="Your Name"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Email *</Text>
              <TextInput
                value={form.email}
                onChangeText={(v) => update('email', v)}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <View>
              <Text className="text-xs text-gray-400 mb-1 ml-1">Password *</Text>
              <TextInput
                value={form.password}
                onChangeText={(v) => update('password', v)}
                secureTextEntry
                textContentType="newPassword"
                placeholder="8+ characters"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="bg-purple-600 rounded-xl px-4 py-4 items-center mt-2"
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-8 flex-row justify-center gap-1">
            <Text className="text-gray-400 text-sm">Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-purple-400 text-sm font-medium">Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
