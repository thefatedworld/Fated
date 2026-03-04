import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import EmberField from '@/components/EmberField';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOGO_WIDTH = SCREEN_W * 0.72;
const LOGO_HEIGHT = LOGO_WIDTH * (258 / 723);

export default function WelcomeScreen() {
  const router = useRouter();
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    actionsOpacity.value = withDelay(
      1500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124,58,237,0.12)', 'transparent', 'rgba(212,175,55,0.06)', 'transparent', 'rgba(239,68,68,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <EmberField count={72} centerY={SCREEN_H * 0.35} />

      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Image
            source={require('../../../assets/fated-text-logo.png')}
            style={styles.textLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Into the Unknown</Text>
        </View>

        <Animated.View style={actionsStyle}>
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
        </Animated.View>
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
    marginBottom: 16,
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
