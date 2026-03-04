import { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, WikiPage } from '@/lib/api-client';

const TAG_COLORS: Record<string, string> = {
  characters: '#3b82f6',
  lore: '#8b5cf6',
  episodes: '#10b981',
  powers: '#f59e0b',
  theories: '#ef4444',
  guide: '#6366f1',
  worldbuilding: '#ec4899',
  magic: '#f59e0b',
  speculation: '#f97316',
  community: '#06b6d4',
  locations: '#10b981',
  items: '#f59e0b',
  events: '#ef4444',
};

const CATEGORY_ORDER = [
  'characters',
  'locations',
  'items',
  'lore',
  'events',
] as const;

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  characters: { emoji: '👤', label: 'Characters' },
  locations: { emoji: '📍', label: 'Locations' },
  items: { emoji: '⚔️', label: 'Items' },
  lore: { emoji: '📜', label: 'Lore' },
  events: { emoji: '📅', label: 'Events' },
};

type Section = {
  category: string;
  emoji: string;
  label: string;
  data: WikiPage[];
};

function buildSections(pages: WikiPage[], filter: string): Section[] {
  const lowerFilter = filter.toLowerCase();
  const filtered = filter
    ? pages.filter((p) => p.title.toLowerCase().includes(lowerFilter))
    : pages;

  const buckets: Record<string, WikiPage[]> = {};

  for (const page of filtered) {
    const cat =
      page.tags?.find((t) => t in CATEGORY_META) ?? 'lore';
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat].push(page);
  }

  const sections: Section[] = [];

  for (const cat of CATEGORY_ORDER) {
    if (buckets[cat]?.length) {
      const meta = CATEGORY_META[cat];
      sections.push({
        category: cat,
        emoji: meta.emoji,
        label: meta.label,
        data: buckets[cat],
      });
      delete buckets[cat];
    }
  }

  for (const [cat, items] of Object.entries(buckets)) {
    if (!items.length) continue;
    const meta = CATEGORY_META[cat] ?? { emoji: '📄', label: cat };
    sections.push({ category: cat, emoji: meta.emoji, label: meta.label, data: items });
  }

  return sections;
}

export default function WikiListScreen() {
  const { seriesId, seriesTitle } = useLocalSearchParams<{
    seriesId: string;
    seriesTitle?: string;
  }>();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const {
    data: pages,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wiki-pages', seriesId],
    queryFn: () => api.listWikiPages(seriesId),
    enabled: !!seriesId,
  });

  const sections = useMemo(
    () => buildSections(pages ?? [], search),
    [pages, search],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#a855f7"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Wiki</Text>
            {seriesTitle && (
              <Text style={styles.subtitle}>{seriesTitle} Lore & Guides</Text>
            )}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Filter pages…"
                placeholderTextColor="#4b5563"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={8}
                >
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.center, { paddingVertical: 80 }]}>
            <Text style={styles.emptyText}>
              {search ? 'No pages match your filter.' : 'No wiki pages yet.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/wiki/page/[slug]',
                params: { slug: item.slug },
              })
            }
            style={styles.pageCard}
            activeOpacity={0.8}
          >
            <Text style={styles.pageTitle}>{item.title}</Text>
            {item.tags?.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: `${TAG_COLORS[tag] ?? '#6b7280'}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: TAG_COLORS[tag] ?? '#6b7280' },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 8 },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 15,
    paddingVertical: 0,
  },
  searchClear: {
    color: '#6b7280',
    fontSize: 14,
    paddingLeft: 8,
  },
  emptyText: { color: '#6b7280', fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionLabel: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  sectionCountText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '700',
  },
  pageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'column',
  },
  pageTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
    paddingRight: 24,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    color: '#374151',
    fontSize: 18,
    position: 'absolute',
    right: 16,
    top: 16,
  },
});
