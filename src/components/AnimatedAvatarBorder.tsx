import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, Easing, Text, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  size: number;
  borderType: string;
}

export const AnimatedAvatarBorder = memo(function AnimatedAvatarBorder({ children, size, borderType }: Props) {
  const S = size + 16;

  if (borderType === 'none' || !borderType) {
    return <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  }

  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <View style={StyleSheet.absoluteFill}>
        {borderType === 'fire_ring'   && <FireRing size={S} />}
        {borderType === 'stars'       && <StarRing size={S} />}
        {borderType === 'rainbow'     && <RainbowRing size={S} />}
        {borderType === 'electric'    && <ElectricRing size={S} />}
        {borderType === 'gold_spin'   && <GoldSpin size={S} />}
        {borderType === 'galaxy_ring' && <GalaxyRing size={S} />}
      </View>
      {children}
    </View>
  );
});

// Each ring is memo'd. The animation loop is started once on mount with
// useNativeDriver: true so it runs on the UI thread and isn't interrupted
// by JS-thread re-renders of the parent (duel screen state updates,
// matchmaking ticks, etc). The loop only stops when the component unmounts.

const FireRing = memo(function FireRing({ size }: { size: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(opacity, { toValue: 1, duration: 1800, useNativeDriver: true })
    ).start();
  }, []);

  const op1 = opacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });
  const op2 = opacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#EF4444',
        opacity: op1,
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#F59E0B',
        opacity: op2,
        shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 8,
      }} />
    </View>
  );
});

const StarRing = memo(function StarRing({ size }: { size: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const R = size / 2;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{
      width: size, height: size,
      transform: [{ rotate }],
    }}>
      {[0, 90, 180, 270].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = R + (R - 8) * Math.cos(rad) - 10;
        const y = R + (R - 8) * Math.sin(rad) - 10;
        return (
          <Text key={i} style={{
            position: 'absolute', left: x, top: y, fontSize: 14,
          }}>
            {i % 2 === 0 ? '⭐' : '✨'}
          </Text>
        );
      })}
    </Animated.View>
  );
});

const RainbowRing = memo(function RainbowRing({ size }: { size: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2;
  const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'];

  return (
    <Animated.View style={{
      width: size, height: size,
      transform: [{ rotate }],
    }}>
      {COLORS.map((c, i) => {
        const angle = (i / COLORS.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const x = R + (R - 4) * Math.cos(rad) - 5;
        const y = R + (R - 4) * Math.sin(rad) - 5;
        return (
          <View key={i} style={{
            position: 'absolute', left: x, top: y,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: c,
          }} />
        );
      })}
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
      }} />
    </Animated.View>
  );
});

const ElectricRing = memo(function ElectricRing({ size }: { size: number }) {
  const flicker = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.2, duration: 100, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.9, duration: 80, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.3, duration: 120, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.1, duration: 200, useNativeDriver: true }),
        Animated.delay(300),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: '#3B82F6',
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#FFFFFF',
        opacity: flicker,
        shadowColor: '#60A5FA', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 10,
      }} />
    </View>
  );
});

const GoldSpin = memo(function GoldSpin({ size }: { size: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2;
  const dotCount = 8;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#F59E0B',
        shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7, shadowRadius: 8,
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: '#FCD34D',
        opacity: glow,
      }} />
      <Animated.View style={{
        width: size, height: size,
        transform: [{ rotate }],
      }}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const rad = (i / dotCount) * 2 * Math.PI;
          const x = R + (R - 4) * Math.cos(rad) - 3;
          const y = R + (R - 4) * Math.sin(rad) - 3;
          return (
            <View key={i} style={{
              position: 'absolute', left: x, top: y,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: i % 2 === 0 ? '#FCD34D' : '#F59E0B',
            }} />
          );
        })}
      </Animated.View>
    </View>
  );
});

const GalaxyRing = memo(function GalaxyRing({ size }: { size: number }) {
  const fast = useRef(new Animated.Value(0)).current;
  const slow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const R = size / 2;

  useEffect(() => {
    Animated.loop(Animated.timing(fast, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(slow, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fastRotate = fast.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const slowRotate = slow.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const dotPositions = (orbitR: number) =>
    [0, 120, 240].map(deg => {
      const rad = (deg * Math.PI) / 180;
      return { x: R + orbitR * Math.cos(rad) - 4, y: R + orbitR * Math.sin(rad) - 4 };
    });

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#4338CA',
        shadowColor: '#818CF8', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 10,
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: '#818CF8',
        opacity: pulse,
      }} />

      <Animated.View style={{
        position: 'absolute',
        width: size, height: size,
        transform: [{ rotate: fastRotate }],
      }}>
        {dotPositions(R - 4).map((pos, i) => (
          <View key={i} style={{
            position: 'absolute', left: pos.x, top: pos.y,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: ['#A78BFA', '#EC4899', '#818CF8'][i],
          }} />
        ))}
      </Animated.View>

      <Animated.View style={{
        position: 'absolute',
        width: size, height: size,
        transform: [{ rotate: slowRotate }],
      }}>
        {dotPositions(R - 4).map((pos, i) => (
          <View key={i} style={{
            position: 'absolute', left: pos.x, top: pos.y,
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: '#6366F1', opacity: 0.6,
          }} />
        ))}
      </Animated.View>
    </View>
  );
});
