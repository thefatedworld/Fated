import { useRef, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const PROGRESS_INTERVAL_MS = 10_000; // Report every 10 seconds

interface Props {
  uri: string;
  onProgress?: (positionSeconds: number, percentComplete: number) => void;
  onEnd?: (watchDuration: number, completed: boolean) => void;
}

export default function VideoPlayer({ uri, onProgress, onEnd }: Props) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());
  const lastProgressReportRef = useRef(0);

  const isLoaded = status?.isLoaded ?? false;
  const isPlaying = isLoaded && (status as { isPlaying?: boolean }).isPlaying;
  const isBuffering = isLoaded && (status as { isBuffering?: boolean }).isBuffering;
  const duration = isLoaded ? (status as { durationMillis?: number }).durationMillis ?? 0 : 0;
  const position = isLoaded ? (status as { positionMillis?: number }).positionMillis ?? 0 : 0;

  const hideControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setIsControlsVisible(false), 3000);
  }, []);

  function handleScreenTap() {
    setIsControlsVisible(true);
    hideControlsTimer();
  }

  async function handlePlayPause() {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
      hideControlsTimer();
    }
  }

  async function handleSeek(direction: 'forward' | 'backward') {
    if (!videoRef.current) return;
    const delta = direction === 'forward' ? 10_000 : -10_000;
    await videoRef.current.setPositionAsync(Math.max(0, position + delta));
  }

  function handleStatusUpdate(newStatus: AVPlaybackStatus) {
    setStatus(newStatus);

    if (!newStatus.isLoaded) return;

    const pos = (newStatus as { positionMillis?: number }).positionMillis ?? 0;
    const dur = (newStatus as { durationMillis?: number }).durationMillis ?? 0;

    // Report progress every ~10 seconds
    if (pos - lastProgressReportRef.current >= PROGRESS_INTERVAL_MS && dur > 0 && onProgress) {
      lastProgressReportRef.current = pos;
      onProgress(pos / 1000, pos / dur);
    }

    // Report end
    if ((newStatus as { didJustFinish?: boolean }).didJustFinish && onEnd) {
      const watchDuration = (Date.now() - startTimeRef.current) / 1000;
      onEnd(watchDuration, true);
    }
  }

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleScreenTap}
      className="flex-1 bg-black relative"
    >
      <Video
        ref={videoRef}
        source={{ uri }}
        style={{ flex: 1 }}
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handleStatusUpdate}
        shouldPlay
        useNativeControls={false}
      />

      {/* Buffering spinner */}
      {isBuffering && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#a855f7" size="large" />
        </View>
      )}

      {/* Controls overlay */}
      {isControlsVisible && (
        <View className="absolute inset-0 justify-end">
          {/* Center controls */}
          <View className="absolute inset-0 flex-row items-center justify-center gap-12">
            <TouchableOpacity onPress={() => handleSeek('backward')} activeOpacity={0.7}>
              <Ionicons name="play-back" size={32} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePlayPause} activeOpacity={0.7}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={44} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSeek('forward')} activeOpacity={0.7}>
              <Ionicons name="play-forward" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Progress bar + time */}
          <View className="px-4 pb-8">
            <View className="flex-row justify-between mb-1">
              <Text className="text-white text-xs">{formatTime(position)}</Text>
              <Text className="text-gray-400 text-xs">{formatTime(duration)}</Text>
            </View>
            <View className="h-1 bg-gray-600 rounded-full overflow-hidden">
              <View
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
