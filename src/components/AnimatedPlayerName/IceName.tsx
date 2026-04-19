import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { ICE_STOPS, lerpHex } from './effects';

interface Props {
  name: string;
  fontSize: number;
  fontWeight: string;
}

function sampleIce(p: number): string {
  const n = ICE_STOPS.length;
  const wrapped = ((p % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i = Math.floor(scaled) % n;
  const next = (i + 1) % n;
  return lerpHex(ICE_STOPS[i], ICE_STOPS[next], scaled - Math.floor(scaled));
}

// Simple sparkle: two tiny dots that fade in/out on an offset cycle.
function Sparkle({ delay, left }: { delay: number; left: number }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(op, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, op]);
  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top: -4,
        fontSize: 10,
        opacity: op,
        color: '#FFFFFF',
      }}
    >
      ✦
    </Animated.Text>
  );
}

// Ice: cyan → white → cyan drift across letters (4s loop) + faint sparkle dots.
export function IceName({ name, fontSize, fontWeight }: Props) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const chars = useMemo(() => name.split(''), [name]);
  const samples = 6;
  const letterColorRanges = useMemo(() => chars.map((_, i) => {
    const phase = chars.length > 0 ? i / chars.length : 0;
    const inputRange: number[] = [];
    const outputRange: string[] = [];
    for (let s = 0; s <= samples; s++) {
      inputRange.push(s / samples);
      outputRange.push(sampleIce(phase + s / samples));
    }
    return { inputRange, outputRange };
  }), [chars]);

  // Rough character-width estimate for sparkle positioning.
  const width = chars.length * fontSize * 0.6;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {chars.map((c, i) => (
        <Animated.Text
          key={i}
          allowFontScaling={false}
          style={{
            fontSize,
            fontWeight: fontWeight as any,
            color: drift.interpolate(letterColorRanges[i]) as any,
            textShadowColor: '#BAE6FD',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 5,
          }}
        >
          {c}
        </Animated.Text>
      ))}
      <Sparkle delay={0} left={width * 0.2} />
      <Sparkle delay={1500} left={width * 0.7} />
    </View>
  );
}
