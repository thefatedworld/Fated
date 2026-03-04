import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, type TokenLedgerEntry } from '@/lib/api-client';
import PersistentTabBar from '@/components/PersistentTabBar';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  iap_credit: { label: 'Purchase', color: '#10b981' },
  unlock_debit: { label: 'Unlock', color: '#f59e0b' },
  refund_debit: { label: 'Refund', color: '#ef4444' },
  admin_credit: { label: 'Admin Credit', color: '#3b82f6' },
  admin_debit: { label: 'Admin Debit', color: '#f97316' },
  promo_credit: { label: 'Promotion', color: '#8b5cf6' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TokenHistoryScreen() {
  const { data: entries, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['token-history'],
    queryFn: () => api.getTokenHistory(undefined, 50),
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  const renderEntry = ({ item }: { item: TokenLedgerEntry }) => {
    const info = TYPE_LABELS[item.type] ?? { label: item.type, color: '#6b7280' };
    const isPositive = item.amount > 0;

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryLeft}>
          <View style={[styles.typeBadge, { backgroundColor: `${info.color}20` }]}>
            <Text style={[styles.typeBadgeText, { color: info.color }]}>
              {info.label}
            </Text>
          </View>
          <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.entryRight}>
          <Text
            style={[
              styles.entryAmount,
              { color: isPositive ? '#10b981' : '#f59e0b' },
            ]}
          >
            {isPositive ? '+' : ''}{item.amount}
          </Text>
          <Text style={styles.entryBalance}>
            bal: {item.balanceAfter}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#030712' }}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.listContent}
        data={entries ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#a855f7"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Token History</Text>
            <Text style={styles.subtitle}>Your transaction ledger</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.center, { paddingVertical: 80 }]}>
            <Text style={styles.emptyText}>No transactions yet.</Text>
          </View>
        }
        renderItem={renderEntry}
      />
      <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: { color: '#6b7280', fontSize: 15 },
  entryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryLeft: { flex: 1, gap: 6 },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  entryDate: { color: '#6b7280', fontSize: 12 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryAmount: { fontSize: 17, fontWeight: '700' },
  entryBalance: { color: '#4b5563', fontSize: 11 },
});
