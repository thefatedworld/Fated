import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

export default function ProfileScreen() {
  const router = useRouter();
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
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
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

  const NOTIF_ITEMS = [
    { key: 'episodeDrops', label: 'New Episodes', desc: 'When a new episode drops' },
    { key: 'countdownReminders', label: 'Countdown Reminders', desc: '24h and 1h before release' },
    { key: 'communityReplies', label: 'Community Replies', desc: 'When someone replies to you' },
    { key: 'authorQa', label: "Author Q&A", desc: 'Live Q&A sessions' },
    { key: 'promotions', label: 'Promotions', desc: 'Token offers and announcements' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* User card */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.displayName ?? user.username)[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.displayName ?? user.username}</Text>
              <Text style={styles.userHandle}>@{user.username}</Text>
              {user.isVerifiedAuthor && (
                <Text style={styles.verifiedBadge}>Verified Author</Text>
              )}
            </View>
          </View>

          {/* Token balance */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>Token Balance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.tokenAmount}>
                  {tokenBalance !== null ? tokenBalance.toLocaleString() : '—'}
                </Text>
                <TouchableOpacity onPress={refreshTokenBalance}>
                  <Text style={styles.refreshIcon}>↻</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/store')}
              style={styles.buyButton}
              activeOpacity={0.85}
            >
              <Text style={styles.buyButtonText}>Buy Tokens</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notification preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          {prefsLoading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color="#a855f7" />
            </View>
          ) : (
            NOTIF_ITEMS.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.prefRow,
                  index < NOTIF_ITEMS.length - 1 && styles.prefRowBorder,
                ]}
              >
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.prefLabel}>{item.label}</Text>
                  <Text style={styles.prefDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={prefs ? prefs[item.key as keyof typeof prefs] as boolean : false}
                  onValueChange={(val) => prefsMutation.mutate({ [item.key]: val })}
                  trackColor={{ false: '#1e293b', true: '#7c3aed' }}
                  thumbColor="#ffffff"
                />
              </View>
            ))
          )}
        </View>
      </View>

      {/* Token History */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tokens</Text>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => router.push('/token-history')}
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>Transaction History</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={handleDataExport} style={[styles.actionRow, styles.prefRowBorder]} activeOpacity={0.7}>
            <Text style={styles.actionText}>Request Data Export</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.actionRow} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Sign Out</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#a855f7',
    fontSize: 20,
    fontWeight: '700',
  },
  userName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  userHandle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 1,
  },
  verifiedBadge: {
    color: '#a855f7',
    fontSize: 11,
    marginTop: 2,
  },
  tokenCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenLabel: {
    color: '#9ca3af',
    fontSize: 13,
  },
  tokenAmount: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  refreshIcon: {
    color: '#a855f7',
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 12,
  },
  buyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  prefLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  prefDesc: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
  },
  chevron: {
    color: '#374151',
    fontSize: 18,
  },
});
