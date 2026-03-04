import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, AuthorSeriesStats, DistributionJob } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

const STATUS_COLORS: Record<DistributionJob['status'], string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
};

const FORMAT_LABELS: Record<DistributionJob['format'], string> = {
  podcast: 'Podcast',
  audiogram: 'Audiogram',
  social_clip: 'Social Clip',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AuthorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isAuthorized =
    user?.isVerifiedAuthor ||
    user?.role === 'content_admin' ||
    user?.role === 'superadmin';

  const {
    data: seriesStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['author-dashboard-stats'],
    queryFn: () => api.getAuthorDashboard(),
    enabled: isAuthorized,
  });

  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['author-distribution-jobs'],
    queryFn: () => api.listDistributionJobs(),
    enabled: isAuthorized,
  });

  const isRefreshing = false;
  const onRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), refetchJobs()]);
  }, [refetchStats, refetchJobs]);

  if (!isAuthorized) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>You don't have access to this page.</Text>
      </View>
    );
  }

  const maxViews = seriesStats?.reduce((max, s) => Math.max(max, s.totalViews), 1) ?? 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#a855f7"
        />
      }
    >
      <Text style={styles.heading}>Author Dashboard</Text>

      {/* Section 1: Series Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Series Analytics</Text>

        {statsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#a855f7" />
          </View>
        ) : !seriesStats?.length ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No series data yet.</Text>
          </View>
        ) : (
          seriesStats.map((s) => (
            <SeriesCard key={s.seriesId} series={s} maxViews={maxViews} />
          ))
        )}
      </View>

      {/* Section 2: Distribution Jobs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Distribution Jobs</Text>

        {jobsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#a855f7" />
          </View>
        ) : !jobs?.length ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No distribution jobs yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {jobs.map((job, idx) => (
              <View
                key={job.id}
                style={[styles.jobRow, idx < jobs.length - 1 && styles.jobRowBorder]}
              >
                <View style={styles.jobBadgeRow}>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>{FORMAT_LABELS[job.format]}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[job.status] + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[job.status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[job.status] }]}>
                      {job.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert('Coming Soon', 'Distribution job creation is not yet available.')
          }
        >
          <Text style={styles.createButtonText}>+ Create New</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SeriesCard({ series, maxViews }: { series: AuthorSeriesStats; maxViews: number }) {
  const barWidth = Math.max((series.totalViews / maxViews) * 100, 4);

  return (
    <View style={styles.card}>
      <Text style={styles.seriesTitle}>{series.title}</Text>

      <View style={styles.statsRow}>
        <StatPill label="Views" value={series.totalViews} />
        <StatPill label="Subscribers" value={series.subscribers} />
        <StatPill label="Episodes" value={series.episodeCount} />
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${barWidth}%` }]} />
      </View>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
  },
  loaderWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },

  // Series card
  seriesTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 3,
  },

  // Distribution jobs
  jobRow: {
    paddingVertical: 12,
  },
  jobRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  jobBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formatBadge: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formatBadgeText: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  jobDate: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
