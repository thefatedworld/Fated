import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import PersistentTabBar from '@/components/PersistentTabBar';

export default function NewThreadScreen() {
  const { seriesId, seriesTitle } = useLocalSearchParams<{
    seriesId: string;
    seriesTitle?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.createThread({
        type: 'series',
        title: title.trim(),
        body: body.trim(),
        seriesId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', seriesId] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const canSubmit = title.trim().length >= 3 && body.trim().length >= 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#030712' }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>New Thread</Text>
      {seriesTitle && (
        <Text style={styles.seriesLabel}>in {seriesTitle}</Text>
      )}

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="What's this about?"
        placeholderTextColor="#4b5563"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />

      <Text style={styles.label}>Body</Text>
      <TextInput
        style={[styles.input, styles.bodyInput]}
        placeholder="Share your thoughts..."
        placeholderTextColor="#4b5563"
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />

      <TouchableOpacity
        onPress={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        style={[styles.submitButton, (!canSubmit || mutation.isPending) && styles.submitDisabled]}
        activeOpacity={0.85}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? 'Posting...' : 'Post Thread'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  content: { padding: 16, paddingBottom: 40 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  seriesLabel: {
    color: '#a855f7',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  bodyInput: {
    minHeight: 140,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});
