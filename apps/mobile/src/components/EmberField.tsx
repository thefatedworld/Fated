import { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const EMBER_COLORS = [
  '#a855f7', '#a855f7', '#c084fc',
  '#d4af37', '#d4af37', '#daa520', '#f59e0b',
  '#ef4444', '#dc2626',
];

interface EmberConfig {
  angle: number;
  radius: number;
  size: number;
  color: string;
  speed: number;
  scaleMin: number;
  scaleMax: number;
  opacityMin: number;
  opacityMax: number;
  delay: number;
  pulseSpeed: number;
}

function generateEmbers(count: number, centerY: number): EmberConfig[] {
  const embers: EmberConfig[] = [];
  for (let i = 0; i < count; i++) {
    embers.push({
      angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      radius: SCREEN_W * 0.22 + Math.random() * SCREEN_W * 0.18,
      size: 2 + Math.random() * 2,
      color: EMBER_COLORS[i % EMBER_COLORS.length],
      speed: 8000 + Math.random() * 7000,
      scaleMin: 0.3,
      scaleMax: 1.2 + Math.random() * 0.6,
      opacityMin: 0.08 + Math.random() * 0.07,
      opacityMax: 0.65 + Math.random() * 0.25,
      delay: Math.random() * 2000,
      pulseSpeed: 1000 + Math.random() * 1500,
    });
  }
  return embers;
}

function Ember({ config, centerY }: { config: EmberConfig; centerY: number }) {
  const rotation = useSharedValue(config.angle);
  const scale = useSharedValue(config.scaleMin);
  const opacity = useSharedValue(config.opacityMin);

  useEffect(() => {
    rotation.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.angle + Math.PI * 2, { duration: config.speed, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    scale.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.scaleMax, { duration: config.pulseSpeed, easing: Easing.inOut(Easing.sin) }),
          withTiming(config.scaleMin, { duration: config.pulseSpeed, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.opacityMax, { duration: config.pulseSpeed * 1.2, easing: Easing.inOut(Easing.sin) }),
          withTiming(config.opacityMin, { duration: config.pulseSpeed * 1.2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const cx = SCREEN_W / 2;
    const cy = centerY;
    const x = cx + Math.cos(rotation.value) * config.radius - config.size / 2;
    const y = cy + Math.sin(rotation.value) * config.radius - config.size / 2;
    return {
      position: 'absolute',
      left: x,
      top: y,
      width: config.size,
      height: config.size,
      borderRadius: config.size / 2,
      backgroundColor: config.color,
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      shadowColor: config.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 14,
      elevation: 8,
    };
  });

  return <Animated.View style={animStyle} />;
}

interface EmberFieldProps {
  count?: number;
  centerY?: number;
}

export default function EmberField({ count = 72, centerY = SCREEN_H * 0.35 }: EmberFieldProps) {
  const embers = useMemo(() => generateEmbers(count, centerY), [count, centerY]);

  return (
    <>
      {embers.map((ember, i) => (
        <Ember key={i} config={ember} centerY={centerY} />
      ))}
    </>
  );
}
