import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { tokenBalance, refreshTokenBalance } = useUiStore();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => api.getNotificationPreferences(),
  });

  const prefsMutation = useMutation({
    mutationFn: (updates: Parameters<typeof api.updateNotificationPreferences>[0]) =>
      api.updateNotificationPreferences(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  async function handleDataExport() {
    Alert.alert(
      'Request Data Export',
      'We will email you a download link with your data within 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: async () => {
            try {
              await api.requestDataExport();
              Alert.alert('Submitted', 'Your data export has been requested.');
            } catch {
              Alert.alert('Error', 'Failed to submit export request.');
            }
          },
        },
      ],
    );
  }

  if (!user) return null;

  return (
    <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* User card */}
      <View className="px-4 pt-6 pb-4">
        <View className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-5">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-purple-700 items-center justify-center">
              <Text className="text-white text-xl font-bold">
                {(user.displayName ?? user.username)[0].toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{user.displayName ?? user.username}</Text>
              <Text className="text-gray-400 text-sm">@{user.username}</Text>
              {user.isVerifiedAuthor && (
                <Text className="text-purple-400 text-xs mt-0.5">Verified Author</Text>
              )}
            </View>
          </View>

          {/* Token balance */}
          <View className="mt-4 bg-purple-950/40 rounded-xl border border-purple-800/30 px-4 py-3 flex-row items-center justify-between">
            <Text className="text-gray-300 text-sm">Token Balance</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-lg">
                {tokenBalance !== null ? tokenBalance.toLocaleString() : '—'}
              </Text>
              <TouchableOpacity onPress={refreshTokenBalance}>
                <Text className="text-purple-400 text-xs">↻</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Notification preferences */}
      <View className="px-4 mt-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">
          Notifications
        </Text>
        <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {prefsLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#a855f7" />
            </View>
          ) : (
            [
              { key: 'episodeDrops', label: 'New Episodes', desc: 'When a new episode drops' },
              { key: 'countdownReminders', label: 'Countdown Reminders', desc: '24h and 1h before release' },
              { key: 'communityReplies', label: 'Community Replies', desc: 'When someone replies to you' },
              { key: 'authorQa', label: "Author Q&A", desc: 'Live Q&A sessions' },
              { key: 'promotions', label: 'Promotions', desc: 'Token offers and announcements' },
            ].map((item, index, arr) => (
              <View
                key={item.key}
                className={`flex-row items-center justify-between px-4 py-4 ${index < arr.length - 1 ? 'border-b border-gray-800' : ''}`}
              >
                <View className="flex-1 mr-4">
                  <Text className="text-white text-sm font-medium">{item.label}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{item.desc}</Text>
                </View>
                <Switch
                  value={prefs ? prefs[item.key as keyof typeof prefs] as boolean : false}
                  onValueChange={(val) =>
                    prefsMutation.mutate({ [item.key]: val })
                  }
                  trackColor={{ false: '#374151', true: '#7c3aed' }}
                  thumbColor="#ffffff"
                />
              </View>
            ))
          )}
        </View>
      </View>

      {/* Account actions */}
      <View className="px-4 mt-6">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">Account</Text>
        <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <TouchableOpacity
            onPress={handleDataExport}
            className="flex-row items-center justify-between px-4 py-4 border-b border-gray-800"
            activeOpacity={0.7}
          >
            <Text className="text-white text-sm">Request Data Export</Text>
            <Text className="text-gray-500 text-sm">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between px-4 py-4"
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-sm">Sign Out</Text>
            <Text className="text-gray-500 text-sm">›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
