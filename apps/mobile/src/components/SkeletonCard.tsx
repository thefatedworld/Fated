import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, { opacity: pulse }]} />
      <Animated.View style={[styles.title, { opacity: pulse }]} />
      <Animated.View style={[styles.subtitle, { opacity: pulse }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
  },
  image: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#111827',
    borderRadius: 12,
  },
  title: {
    width: '70%',
    height: 12,
    backgroundColor: '#111827',
    borderRadius: 6,
    marginTop: 10,
  },
  subtitle: {
    width: '50%',
    height: 10,
    backgroundColor: '#111827',
    borderRadius: 5,
    marginTop: 6,
  },
});
