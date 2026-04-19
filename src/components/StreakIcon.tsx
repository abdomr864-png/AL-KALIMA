import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, View, Animated, StyleSheet } from 'react-native';

interface Props {
  streak: number;
  isFrozen: boolean;
  onPress: () => void;
}

export const StreakIcon = React.memo(function StreakIcon({ streak, isFrozen, onPress }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const frozenGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulseAnim.setValue(1);
    frozenGlow.setValue(0);

    if (isFrozen) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(frozenGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(frozenGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else if (streak > 0) {
      const duration = Math.max(600, 1500 - streak * 10);
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [isFrozen, streak]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.container, isFrozen && { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
        {/* Frozen glow overlay */}
        {isFrozen && (
          <Animated.View style={[StyleSheet.absoluteFill, {
            backgroundColor: 'rgba(96,165,250,0.4)',
            borderRadius: 14,
            opacity: frozenGlow,
          }]} />
        )}
        {/* Icon */}
        <Animated.Text style={[styles.emoji, !isFrozen && { transform: [{ scale: pulseAnim }] }]}>
          {streak === 0 ? '🔥' : isFrozen ? '🧊' : '🔥'}
        </Animated.Text>

        {/* Streak number */}
        <Text style={[styles.number, isFrozen && styles.numberFrozen]}>
          {streak}
        </Text>

        {/* Ice crystal overlay when frozen */}
        {isFrozen && (
          <View style={styles.iceOverlay}>
            <Text style={styles.iceOverlayText}>❄️</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  emoji: {
    fontSize: 18,
  },
  number: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F59E0B',
  },
  numberFrozen: {
    color: '#60A5FA',
  },
  iceOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  iceOverlayText: {
    fontSize: 10,
  },
});
