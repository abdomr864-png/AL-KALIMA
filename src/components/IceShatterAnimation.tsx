import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing, Dimensions, StyleSheet } from 'react-native';

interface ShardData {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  rotateEnd: number;
}

function IceShard({ shard, cx, cy }: { shard: ShardData; cx: number; cy: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(shard.delay),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1, duration: shard.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1, duration: shard.duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(shard.duration * 0.4),
          Animated.timing(opacity, {
            toValue: 0, duration: shard.duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const tx = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(shard.angle) * shard.distance],
  });
  const ty = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(shard.angle) * shard.distance],
  });
  const rotateStr = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${shard.rotateEnd}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - shard.size / 2,
        top: cy - shard.size / 2,
        width: shard.size,
        height: shard.size,
        backgroundColor: '#93C5FD',
        opacity,
        transform: [
          { translateX: tx },
          { translateY: ty },
          { rotate: rotateStr },
        ],
        borderRadius: 2,
      }}
    />
  );
}

export function IceShatterAnimation({ streakNumber, onDone }: { streakNumber: number; onDone: () => void }) {
  const { width: W, height: H } = Dimensions.get('window');
  const cx = W / 2;
  const cy = H / 2;

  const SHARDS: ShardData[] = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    return {
      id: i,
      angle,
      distance: 60 + Math.random() * 80,
      size: 8 + Math.random() * 14,
      duration: 600 + Math.random() * 400,
      delay: Math.random() * 150,
      rotateEnd: -180 + Math.random() * 360,
    };
  });

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const fireScale = useRef(new Animated.Value(0)).current;
  const fireOpacity = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // 1. Flash white
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    // 2. Fire explodes in from center
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(fireScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
        Animated.timing(fireOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(numberScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 200);

    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
      {/* White flash */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: flashOpacity }]} />

      {/* Ice shards flying outward */}
      {SHARDS.map(shard => (
        <IceShard key={shard.id} shard={shard} cx={cx} cy={cy} />
      ))}

      {/* Fire emoji exploding in */}
      <Animated.View style={[styles.fireContainer, {
        opacity: fireOpacity,
        transform: [{ scale: fireScale }],
      }]}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Animated.Text style={[styles.fireNumber, { transform: [{ scale: numberScale }] }]}>
          {streakNumber}
        </Animated.Text>
        <Text style={styles.fireLabel}>سلسلتك عادت! 🔥</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fireContainer: {
    alignItems: 'center',
    gap: 4,
  },
  fireEmoji: {
    fontSize: 72,
  },
  fireNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#F59E0B',
  },
  fireLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 8,
  },
});
