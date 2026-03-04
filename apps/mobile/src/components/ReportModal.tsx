import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/lib/api-client';

const CATEGORIES = ['Spam', 'Harassment', 'Inappropriate', 'Misinformation', 'Other'] as const;

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'thread' | 'reply' | 'wiki_page' | 'user';
  targetId: string;
}

export default function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setSelectedCategory(null);
    setDescription('');
    setSubmitting(false);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      await api.reportAbuse(targetType, targetId, selectedCategory, description || undefined);
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Report submitted. Thank you!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Report Content</Text>

              <View style={styles.categories}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Additional details (optional)"
                placeholderTextColor="#4b5563"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[styles.submitButton, (!selectedCategory || submitting) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!selectedCategory || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Report</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: '#a855f7',
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#a855f7',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#a855f7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 14,
  },
  successContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  successText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
});
