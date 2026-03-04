import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: { key: string; type: string; text: string }[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      elements.push({ key: `h1-${i}`, type: 'h1', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      elements.push({ key: `h2-${i}`, type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      elements.push({ key: `h3-${i}`, type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('- ')) {
      elements.push({ key: `li-${i}`, type: 'li', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('| ')) {
      elements.push({ key: `tr-${i}`, type: 'tr', text: trimmed });
    } else if (trimmed.startsWith('---') || trimmed.startsWith('|---')) {
      elements.push({ key: `hr-${i}`, type: 'hr', text: '' });
    } else if (trimmed === '') {
      elements.push({ key: `br-${i}`, type: 'br', text: '' });
    } else {
      elements.push({ key: `p-${i}`, type: 'p', text: trimmed });
    }
  });

  return elements.map((el) => {
    switch (el.type) {
      case 'h1':
        return (
          <Text key={el.key} style={mdStyles.h1}>
            {el.text}
          </Text>
        );
      case 'h2':
        return (
          <Text key={el.key} style={mdStyles.h2}>
            {el.text}
          </Text>
        );
      case 'h3':
        return (
          <Text key={el.key} style={mdStyles.h3}>
            {el.text}
          </Text>
        );
      case 'li': {
        const formatted = el.text.replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <View key={el.key} style={mdStyles.listItem}>
            <Text style={mdStyles.bullet}>•</Text>
            <Text style={mdStyles.listText}>{formatted}</Text>
          </View>
        );
      }
      case 'tr': {
        const cells = el.text
          .split('|')
          .filter((c) => c.trim())
          .map((c) => c.trim());
        return (
          <View key={el.key} style={mdStyles.tableRow}>
            {cells.map((cell, ci) => (
              <Text key={ci} style={mdStyles.tableCell}>
                {cell}
              </Text>
            ))}
          </View>
        );
      }
      case 'hr':
        return <View key={el.key} style={mdStyles.hr} />;
      case 'br':
        return <View key={el.key} style={mdStyles.br} />;
      default: {
        const formatted = el.text.replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <Text key={el.key} style={mdStyles.paragraph}>
            {formatted}
          </Text>
        );
      }
    }
  });
}

export default function WikiPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ['wiki-page', slug],
    queryFn: () => api.getWikiPage(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!page) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Page not found.</Text>
      </View>
    );
  }

  const body = page.currentRevision?.body ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {page.tags?.length > 0 && (
        <View style={styles.tagRow}>
          {page.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.body}>{renderMarkdown(body)}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { color: '#a855f7', fontSize: 11, fontWeight: '600' },
  body: { gap: 2 },
  errorText: { color: '#6b7280', fontSize: 14 },
});

const mdStyles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  h2: {
    fontSize: 19,
    fontWeight: '700',
    color: '#e5e7eb',
    marginTop: 20,
    marginBottom: 6,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d1d5db',
    marginTop: 16,
    marginBottom: 4,
  },
  paragraph: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginVertical: 2,
  },
  bullet: {
    color: '#a855f7',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 22,
  },
  listText: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    paddingVertical: 6,
  },
  tableCell: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  hr: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 8,
  },
  br: { height: 8 },
});
