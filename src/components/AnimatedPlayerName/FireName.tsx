import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { FIRE_STOPS, lerpHex } from './effects';

interface Props {
  name: string;
  fontSize: number;
  fontWeight: string;
}

function sampleFire(p: number): string {
  const n = FIRE_STOPS.length;
  const wrapped = ((p % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i = Math.floor(scaled) % n;
  const next = (i + 1) % n;
  return lerpHex(FIRE_STOPS[i], FIRE_STOPS[next], scaled - Math.floor(scaled));
}

// Fire: colors drift red → orange → yellow per letter, phase-shifted to feel like an upward/forward drift.
// Opacity flickers gently. 1.5s loop.
export function FireName({ name, fontSize, fontWeight }: Props) {
  const drift = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: false }),
    );
    const flickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.92, duration: 100, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    );
    driftLoop.start();
    flickerLoop.start();
    return () => {
      driftLoop.stop();
      flickerLoop.stop();
    };
  }, [drift, flicker]);

  const chars = useMemo(() => name.split(''), [name]);
  const samples = 6;
  const letterColorRanges = useMemo(() => chars.map((_, i) => {
    const phase = chars.length > 0 ? i / chars.length : 0;
    const inputRange: number[] = [];
    const outputRange: string[] = [];
    for (let s = 0; s <= samples; s++) {
      inputRange.push(s / samples);
      // Negative phase so later letters pull "behind" — feels like flames licking forward.
      outputRange.push(sampleFire(-phase + s / samples));
    }
    return { inputRange, outputRange };
  }), [chars]);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', opacity: flicker }}>
      {chars.map((c, i) => (
        <Animated.Text
          key={i}
          allowFontScaling={false}
          style={{
            fontSize,
            fontWeight: fontWeight as any,
            color: drift.interpolate(letterColorRanges[i]) as any,
            textShadowColor: '#DC2626',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 6,
          }}
        >
          {c}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}
