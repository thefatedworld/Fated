import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, WikiRevision } from '@/lib/api-client';
import PersistentTabBar from '@/components/PersistentTabBar';

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  characters: { label: 'Character', color: '#3b82f6' },
  locations: { label: 'Location', color: '#10b981' },
  items: { label: 'Item', color: '#f59e0b' },
  lore: { label: 'Lore', color: '#8b5cf6' },
  events: { label: 'Event', color: '#ef4444' },
  episodes: { label: 'Episode', color: '#10b981' },
  powers: { label: 'Power', color: '#f59e0b' },
  theories: { label: 'Theory', color: '#ef4444' },
  guide: { label: 'Guide', color: '#6366f1' },
  worldbuilding: { label: 'Worldbuilding', color: '#ec4899' },
  magic: { label: 'Magic', color: '#f59e0b' },
  speculation: { label: 'Speculation', color: '#f97316' },
  community: { label: 'Community', color: '#06b6d4' },
};

const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

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
          <View key={el.key} style={mdStyles.h2Wrapper}>
            <View style={mdStyles.h2Accent} />
            <Text style={mdStyles.h2}>{el.text}</Text>
          </View>
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

function RevisionTimeline({ revisions }: { revisions: WikiRevision[] }) {
  return (
    <View style={styles.revisionList}>
      {revisions.map((rev, idx) => (
        <View key={rev.id} style={styles.revisionRow}>
          <View style={styles.timelineTrack}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: STATUS_COLORS[rev.status] ?? '#6b7280' },
              ]}
            />
            {idx < revisions.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.revisionContent}>
            <View style={styles.revisionHeader}>
              <Text style={styles.revisionAuthor}>
                {rev.authorName ?? 'Unknown author'}
              </Text>
              <View
                style={[
                  styles.revisionStatusBadge,
                  {
                    backgroundColor: `${STATUS_COLORS[rev.status] ?? '#6b7280'}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.revisionStatusText,
                    { color: STATUS_COLORS[rev.status] ?? '#6b7280' },
                  ]}
                >
                  {rev.status}
                </Text>
              </View>
            </View>
            <Text style={styles.revisionMeta}>
              v{rev.versionNum} · {formatRelative(rev.createdAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function WikiPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ['wiki-page', slug],
    queryFn: () => api.getWikiPage(slug),
    enabled: !!slug,
  });

  const { data: revisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['wiki-page-revisions', slug],
    queryFn: () => api.getWikiPageRevisions(slug),
    enabled: !!slug && revisionsOpen,
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
  const categoryTag = page.tags?.find((t) => t in CATEGORY_BADGE);
  const badge = categoryTag ? CATEGORY_BADGE[categoryTag] : null;
  const updatedAt = page.currentRevision?.createdAt;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Category badge + last updated */}
      <View style={styles.metaRow}>
        {badge && (
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${badge.color}20` },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        )}
        {updatedAt && (
          <Text style={styles.updatedAt}>Updated {formatRelative(updatedAt)}</Text>
        )}
      </View>

      {/* Tags */}
      {page.tags?.length > 0 && (
        <View style={styles.tagRow}>
          {page.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Article body */}
      <View style={styles.body}>{renderMarkdown(body)}</View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {page.seriesId && (
          <TouchableOpacity
            style={styles.discussButton}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/community/[seriesId]',
                params: { seriesId: page.seriesId! },
              })
            }
          >
            <Text style={styles.discussButtonText}>Discuss on Community</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={() => Alert.alert('Coming Soon', 'Edit suggestions coming soon')}
        >
          <Text style={styles.editButtonText}>Suggest Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Revision history */}
      <TouchableOpacity
        style={styles.revisionToggle}
        activeOpacity={0.8}
        onPress={() => setRevisionsOpen((o) => !o)}
      >
        <Text style={styles.revisionToggleText}>Revision History</Text>
        <Text style={styles.revisionChevron}>
          {revisionsOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {revisionsOpen && (
        <View style={styles.revisionSection}>
          {revisionsLoading ? (
            <ActivityIndicator
              color="#a855f7"
              size="small"
              style={{ marginVertical: 16 }}
            />
          ) : revisions && revisions.length > 0 ? (
            <RevisionTimeline revisions={revisions} />
          ) : (
            <Text style={styles.revisionEmpty}>No revisions found.</Text>
          )}
        </View>
      )}
    </ScrollView>
    <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  updatedAt: {
    color: '#6b7280',
    fontSize: 12,
  },
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    marginBottom: 24,
  },
  discussButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  discussButtonText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  revisionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
  },
  revisionToggleText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },
  revisionChevron: {
    color: '#6b7280',
    fontSize: 12,
  },
  revisionSection: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#1e293b',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
  },
  revisionList: {
    gap: 0,
  },
  revisionRow: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#1e293b',
    marginTop: 4,
  },
  revisionContent: {
    flex: 1,
    paddingBottom: 16,
  },
  revisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revisionAuthor: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  revisionStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  revisionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  revisionMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  revisionEmpty: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

const mdStyles = StyleSheet.create({
  h1: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  h2Wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  h2Accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#a855f7',
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d1d5db',
    marginTop: 18,
    marginBottom: 6,
  },
  paragraph: {
    color: '#9ca3af',
    fontSize: 15,
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginVertical: 3,
  },
  bullet: {
    color: '#a855f7',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 24,
  },
  listText: {
    color: '#9ca3af',
    fontSize: 15,
    lineHeight: 24,
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
    marginVertical: 12,
  },
  br: { height: 10 },
});
