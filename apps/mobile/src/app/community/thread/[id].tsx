import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Thread, type ThreadReply } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import ReportModal from '@/components/ReportModal';
import ModToolbar from '@/components/ModToolbar';
import PersistentTabBar from '@/components/PersistentTabBar';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isMod = ['moderator', 'content_admin', 'superadmin'].includes(user?.role ?? '');

  const [replyText, setReplyText] = useState('');
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReplyId, setReportReplyId] = useState<string | null>(null);

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: () => api.getThread(id),
    enabled: !!id,
  });

  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['thread-replies', id],
    queryFn: () => api.listReplies(id),
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: () => api.createReply(id, replyText),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['thread-replies', id] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ targetType, targetId, value }: { targetType: 'thread' | 'reply'; targetId: string; value: 1 | -1 }) =>
      api.vote(targetType, targetId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
      queryClient.invalidateQueries({ queryKey: ['thread-replies', id] });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => api.deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-replies', id] });
    },
  });

  const confirmDeleteReply = (replyId: string) => {
    Alert.alert('Delete Reply', 'Are you sure you want to delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteReplyMutation.mutate(replyId),
      },
    ]);
  };

  if (threadLoading || repliesLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Thread not found.</Text>
      </View>
    );
  }

  const renderReply = ({ item }: { item: ThreadReply }) => (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <Text style={[styles.replyBody, { flex: 1 }]}>{item.body}</Text>
        <TouchableOpacity onPress={() => setReportReplyId(item.id)} style={styles.menuButton} activeOpacity={0.7}>
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.replyMeta}>
        <TouchableOpacity
          onPress={() => voteMutation.mutate({ targetType: 'reply', targetId: item.id, value: 1 })}
          style={styles.voteButton}
          activeOpacity={0.7}
        >
          <Text style={styles.voteText}>▲</Text>
        </TouchableOpacity>
        <Text style={styles.voteCount}>{item.voteCount}</Text>
        <TouchableOpacity
          onPress={() => voteMutation.mutate({ targetType: 'reply', targetId: item.id, value: -1 })}
          style={styles.voteButton}
          activeOpacity={0.7}
        >
          <Text style={styles.voteText}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.replyTime}>{timeAgo(item.createdAt)}</Text>
        {isMod && (
          <TouchableOpacity onPress={() => confirmDeleteReply(item.id)} style={styles.modDeleteButton} activeOpacity={0.7}>
            <Text style={styles.modDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={replies ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.threadCard}>
              <View style={styles.threadTopRow}>
                <View style={[styles.badges, { flex: 1 }]}>
                  {thread.isPinned && (
                    <View style={styles.pinnedBadge}>
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                  {thread.isLocked && (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedText}>Locked</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => setReportVisible(true)} style={styles.menuButton} activeOpacity={0.7}>
                  <Text style={styles.menuDots}>⋯</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.threadTitle}>{thread.title}</Text>
              <Text style={styles.threadBody}>{thread.body}</Text>
              <View style={styles.threadMeta}>
                <TouchableOpacity
                  onPress={() => voteMutation.mutate({ targetType: 'thread', targetId: thread.id, value: 1 })}
                  style={styles.voteButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voteText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.voteCount}>{thread.voteCount}</Text>
                <TouchableOpacity
                  onPress={() => voteMutation.mutate({ targetType: 'thread', targetId: thread.id, value: -1 })}
                  style={styles.voteButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voteText}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.replyTime}>{timeAgo(thread.createdAt)}</Text>
              </View>

              <View style={styles.repliesHeader}>
                <Text style={styles.repliesTitle}>
                  Replies ({replies?.length ?? 0})
                </Text>
              </View>
            </View>

            {isMod && (
              <ModToolbar
                threadId={id}
                isPinned={thread.isPinned}
                isLocked={thread.isLocked}
                onAction={() => {
                  queryClient.invalidateQueries({ queryKey: ['thread', id] });
                }}
              />
            )}
          </>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={styles.emptyText}>No replies yet. Be the first!</Text>
          </View>
        }
        renderItem={renderReply}
      />

      {!thread.isLocked && (
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            placeholderTextColor="#4b5563"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            onPress={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
            style={[
              styles.sendButton,
              (!replyText.trim() || replyMutation.isPending) && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.sendText}>
              {replyMutation.isPending ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="thread"
        targetId={id}
      />
      <ReportModal
        visible={!!reportReplyId}
        onClose={() => setReportReplyId(null)}
        targetType="reply"
        targetId={reportReplyId ?? ''}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 16 },
  threadCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  threadTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  badges: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  pinnedBadge: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pinnedText: { color: '#eab308', fontSize: 10, fontWeight: '600' },
  lockedBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockedText: { color: '#ef4444', fontSize: 10, fontWeight: '600' },
  threadTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  threadBody: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 22,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
  },
  repliesHeader: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  repliesTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  replyHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  replyBody: { color: '#d1d5db', fontSize: 14, lineHeight: 20 },
  replyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  voteButton: { padding: 4 },
  voteText: { color: '#6b7280', fontSize: 12 },
  voteCount: { color: '#9ca3af', fontSize: 13, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  replyTime: { color: '#4b5563', fontSize: 12, marginLeft: 8 },
  menuButton: { padding: 4, marginLeft: 8 },
  menuDots: { color: '#6b7280', fontSize: 18, fontWeight: '700' },
  modDeleteButton: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6 },
  modDeleteText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  errorText: { color: '#6b7280', fontSize: 14 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
