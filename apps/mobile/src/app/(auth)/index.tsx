import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
const LOGO_WIDTH = SCREEN_W * 0.72;
const LOGO_HEIGHT = LOGO_WIDTH * (258 / 723);

const EMBER_COLORS = [
  '#a855f7', '#a855f7',
  '#d4af37', '#d4af37', '#daa520',
  '#ef4444', '#dc2626',
  '#c084fc', '#f59e0b',
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
}

function generateEmbers(count: number): EmberConfig[] {
  const embers: EmberConfig[] = [];
  for (let i = 0; i < count; i++) {
    embers.push({
      angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      radius: SCREEN_W * 0.28 + (Math.random() - 0.5) * SCREEN_W * 0.12,
      size: 3 + Math.random() * 4,
      color: EMBER_COLORS[i % EMBER_COLORS.length],
      speed: 8000 + Math.random() * 6000,
      scaleMin: 0.4,
      scaleMax: 1.0 + Math.random() * 0.5,
      opacityMin: 0.15 + Math.random() * 0.1,
      opacityMax: 0.4 + Math.random() * 0.2,
      delay: Math.random() * 3000,
    });
  }
  return embers;
}

function Ember({ config }: { config: EmberConfig }) {
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
          withTiming(config.scaleMax, { duration: 1500 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(config.scaleMin, { duration: 1500 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.opacityMax, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(config.opacityMin, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const cx = SCREEN_W / 2;
    const cy = SCREEN_H * 0.35;
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
      shadowOpacity: 0.8,
      shadowRadius: 6,
    };
  });

  return <Animated.View style={animStyle} />;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const embers = useMemo(() => generateEmbers(24), []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124,58,237,0.12)', 'transparent', 'rgba(212,175,55,0.06)', 'transparent', 'rgba(239,68,68,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {embers.map((ember, i) => (
        <Ember key={i} config={ember} />
      ))}

      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Image
            source={require('../../../assets/fated-text-logo.png')}
            style={styles.textLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Into the Unknown</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 48,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: SCREEN_H * 0.08,
  },
  textLogo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 17,
    color: '#d4af37',
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  legal: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
