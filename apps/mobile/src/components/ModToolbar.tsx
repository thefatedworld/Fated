import { TouchableOpacity, View, Text, Alert, StyleSheet } from 'react-native';
import { api } from '@/lib/api-client';

interface ModToolbarProps {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
  onAction: () => void;
}

export default function ModToolbar({ threadId, isPinned, isLocked, onAction }: ModToolbarProps) {
  const handlePin = async () => {
    await api.pinThread(threadId, !isPinned);
    onAction();
  };

  const handleLock = async () => {
    await api.lockThread(threadId, !isLocked);
    onAction();
  };

  const handleDelete = () => {
    Alert.alert('Delete Thread', 'Are you sure you want to delete this thread?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.deleteThread(threadId);
          onAction();
        },
      },
    ]);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.pill} onPress={handlePin} activeOpacity={0.7}>
        <Text style={styles.icon}>{isPinned ? '📌' : '📍'}</Text>
        <Text style={styles.label}>{isPinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.pill} onPress={handleLock} activeOpacity={0.7}>
        <Text style={styles.icon}>{isLocked ? '🔓' : '🔒'}</Text>
        <Text style={styles.label}>{isLocked ? 'Unlock' : 'Lock'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.pill, styles.deletePill]} onPress={handleDelete} activeOpacity={0.7}>
        <Text style={styles.icon}>🗑</Text>
        <Text style={[styles.label, styles.deleteLabel]}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deletePill: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteLabel: {
    color: '#ef4444',
  },
});
