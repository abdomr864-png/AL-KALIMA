import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import type { BorderAnimation } from '../lib/premiumCosmetics';

interface BorderProps {
  size: number;
}

// Fire ring — border color cycles through fire colors
function FireRingBorder({ size }: BorderProps) {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#EF4444', '#F97316', '#F59E0B', '#F97316', '#EF4444'],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 8,
      height: size + 8,
      borderRadius: (size + 8) / 2,
      borderWidth: 3,
      borderColor,
    }} />
  );
}

// Stars — static positioned stars with opacity pulse
function StarsBorder({ size }: BorderProps) {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 0.4, duration: 1000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const stars = ['⭐', '✨', '⭐', '✨'];
  const r = (size + 8) / 2;

  return (
    <View style={{
      position: 'absolute',
      width: size + 16,
      height: size + 16,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {stars.map((star, i) => {
        const angle = (i / stars.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <Animated.Text key={i} style={{
            position: 'absolute',
            fontSize: 10,
            opacity: opacityAnim,
            top: r + Math.sin(angle) * (r + 2) - 5,
            left: r + Math.cos(angle) * (r + 2) - 5,
          }}>{star}</Animated.Text>
        );
      })}
    </View>
  );
}

// Rainbow — border cycles through rainbow colors
function RainbowBorder({ size }: BorderProps) {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    outputRange: ['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444'],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 8,
      height: size + 8,
      borderRadius: (size + 8) / 2,
      borderWidth: 3,
      borderColor,
    }} />
  );
}

// Electric — pulsing blue/white border
function ElectricBorder({ size }: BorderProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 150, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#3B82F6', '#93C5FD', '#FFFFFF'],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 8,
      height: size + 8,
      borderRadius: (size + 8) / 2,
      borderWidth: 3,
      borderColor,
    }} />
  );
}

// Gold spin — pulsing gold border color
function GoldSpinBorder({ size }: BorderProps) {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#F59E0B', '#FCD34D', '#D97706', '#F59E0B'],
  });

  const borderWidth = colorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [3, 4, 3],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 8,
      height: size + 8,
      borderRadius: (size + 8) / 2,
      borderWidth,
      borderColor,
    }} />
  );
}

// Galaxy — deep purple/blue pulsing border
function GalaxyBorder({ size }: BorderProps) {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#6366F1', '#8B5CF6', '#EC4899', '#8B5CF6', '#6366F1'],
  });

  const borderWidth = colorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [3, 4, 3],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 8,
      height: size + 8,
      borderRadius: (size + 8) / 2,
      borderWidth,
      borderColor,
    }} />
  );
}

// Main export
export function AnimatedBorder({ animation, size }: { animation: BorderAnimation; size: number }) {
  if (!animation) return null;

  switch (animation) {
    case 'fire': return <FireRingBorder size={size} />;
    case 'stars': return <StarsBorder size={size} />;
    case 'rainbow': return <RainbowBorder size={size} />;
    case 'electric': return <ElectricBorder size={size} />;
    case 'gold_spin': return <GoldSpinBorder size={size} />;
    case 'galaxy': return <GalaxyBorder size={size} />;
    default: return null;
  }
}
