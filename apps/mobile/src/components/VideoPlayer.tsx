import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROGRESS_INTERVAL_MS = 10_000;

export interface EpisodeMeta {
  id: string;
  title: string;
  description?: string | null;
  number: number;
}

interface Props {
  uri: string;
  episode: EpisodeMeta;
  nextEpisode?: EpisodeMeta | null;
  hasPrev: boolean;
  hasNext: boolean;
  onProgress?: (positionSeconds: number, percentComplete: number) => void;
  onEnd?: (watchDuration: number, completed: boolean) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
}

export default function VideoPlayer({
  uri,
  episode,
  nextEpisode,
  hasPrev,
  hasNext,
  onProgress,
  onEnd,
  onNext,
  onPrev,
  onClose,
}: Props) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());
  const lastProgressReportRef = useRef(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLoaded = status?.isLoaded ?? false;
  const isPlaying = isLoaded && (status as any).isPlaying;
  const isBuffering = isLoaded && (status as any).isBuffering;
  const duration = isLoaded ? (status as any).durationMillis ?? 0 : 0;
  const position = isLoaded ? (status as any).positionMillis ?? 0 : 0;
  const didFinish = isLoaded && (status as any).didJustFinish;

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hideControls = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  }, [fadeAnim]);

  const scheduleHide = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(hideControls, 3000);
  }, [hideControls]);

  function handleScreenTap() {
    if (controlsVisible) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      hideControls();
    } else {
      showControls();
      if (isPlaying) scheduleHide();
    }
  }

  async function handlePlayPause() {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      showControls();
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    } else {
      await videoRef.current.playAsync();
      scheduleHide();
    }
  }

  function handleStatusUpdate(newStatus: AVPlaybackStatus) {
    setStatus(newStatus);
    if (!newStatus.isLoaded) return;

    const pos = (newStatus as any).positionMillis ?? 0;
    const dur = (newStatus as any).durationMillis ?? 0;

    if (pos - lastProgressReportRef.current >= PROGRESS_INTERVAL_MS && dur > 0 && onProgress) {
      lastProgressReportRef.current = pos;
      onProgress(pos / 1000, pos / dur);
    }

    if ((newStatus as any).didJustFinish && onEnd) {
      const watchDuration = (Date.now() - startTimeRef.current) / 1000;
      onEnd(watchDuration, true);
    }
  }

  useEffect(() => {
    if (isPlaying && controlsVisible) scheduleHide();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    lastProgressReportRef.current = 0;
  }, [uri]);

  function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleScreenTap}>
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            onPlaybackStatusUpdate={handleStatusUpdate}
            shouldPlay
            useNativeControls={false}
          />

          {isBuffering && (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator color="#a855f7" size="large" />
            </View>
          )}

          {controlsVisible && (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
              {/* Close button */}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>

              {/* Center play/pause */}
              <View style={styles.centerControls}>
                {hasPrev && (
                  <TouchableOpacity onPress={onPrev} style={styles.skipButton} activeOpacity={0.7}>
                    <Ionicons name="play-skip-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handlePlayPause} style={styles.playButton} activeOpacity={0.8}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#ffffff" />
                </TouchableOpacity>
                {hasNext && (
                  <TouchableOpacity onPress={onNext} style={styles.skipButton} activeOpacity={0.7}>
                    <Ionicons name="play-skip-forward" size={28} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom overlay with gradient */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.bottomOverlay}
              >
                <View style={styles.episodeInfoContainer}>
                  <Text style={styles.episodeNumber}>Episode {episode.number}</Text>
                  <Text style={styles.episodeTitle} numberOfLines={1}>{episode.title}</Text>
                  {episode.description && (
                    <Text style={styles.episodeDescription} numberOfLines={2}>
                      {episode.description}
                    </Text>
                  )}
                </View>

                {/* Navigation row */}
                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={onPrev}
                    disabled={!hasPrev}
                    style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
                  >
                    <Ionicons name="chevron-back" size={18} color={hasPrev ? '#ffffff' : '#4b5563'} />
                    <Text style={[styles.navText, !hasPrev && styles.navTextDisabled]}>Prev</Text>
                  </TouchableOpacity>

                  <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeSeparator}>/</Text>
                    <Text style={styles.timeDuration}>{formatTime(duration)}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={onNext}
                    disabled={!hasNext}
                    style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
                  >
                    <Text style={[styles.navText, !hasNext && styles.navTextDisabled]}>Next</Text>
                    <Ionicons name="chevron-forward" size={18} color={hasNext ? '#ffffff' : '#4b5563'} />
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoWrapper: {
    flex: 1,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControls: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(124,58,237,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  episodeInfoContainer: {
    marginBottom: 12,
  },
  episodeNumber: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  episodeTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  episodeDescription: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  navTextDisabled: {
    color: '#4b5563',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeSeparator: {
    color: '#6b7280',
    fontSize: 12,
  },
  timeDuration: {
    color: '#6b7280',
    fontSize: 12,
  },
  progressContainer: {
    paddingTop: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 2,
  },
});
