import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { RAINBOW_STOPS, lerpHex } from './effects';

interface Props {
  name: string;
  fontSize: number;
  fontWeight: string;
}

// Samples the rainbow palette as a continuous loop at position p (any real number).
function sampleRainbow(p: number): string {
  const n = RAINBOW_STOPS.length;
  const wrapped = ((p % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i = Math.floor(scaled) % n;
  const next = (i + 1) % n;
  return lerpHex(RAINBOW_STOPS[i], RAINBOW_STOPS[next], scaled - Math.floor(scaled));
}

// Rainbow: hue wave flows across letters (3s loop) + outer glow breathes (2s loop).
export function RainbowName({ name, fontSize, fontWeight }: Props) {
  const flow = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const flowLoop = Animated.loop(
      Animated.timing(flow, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false }),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    flowLoop.start();
    glowLoop.start();
    return () => {
      flowLoop.stop();
      glowLoop.stop();
    };
  }, [flow, glow]);

  const chars = useMemo(() => name.split(''), [name]);

  // Per-letter interpolation: same animated value, output shifted by letter position.
  // Build 9 sample points so the interpolation is smooth across the full cycle.
  const samples = 8;
  const letterColorRanges = useMemo(() => chars.map((_, i) => {
    const phase = chars.length > 0 ? i / chars.length : 0;
    const inputRange: number[] = [];
    const outputRange: string[] = [];
    for (let s = 0; s <= samples; s++) {
      inputRange.push(s / samples);
      outputRange.push(sampleRainbow(phase + s / samples));
    }
    return { inputRange, outputRange };
  }), [chars]);

  const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [4, 11] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {chars.map((c, i) => {
        const color = flow.interpolate(letterColorRanges[i]) as any;
        return (
          <Animated.Text
            key={i}
            allowFontScaling={false}
            style={{
              fontSize,
              fontWeight: fontWeight as any,
              color,
              textShadowColor: color,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: shadowRadius as any,
            }}
          >
            {c}
          </Animated.Text>
        );
      })}
    </View>
  );
}
