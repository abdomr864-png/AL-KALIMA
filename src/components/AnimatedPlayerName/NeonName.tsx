import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text } from 'react-native';
import { NEON_CORE, NEON_GLOW } from './effects';

interface Props {
  name: string;
  fontSize: number;
  fontWeight: string;
  variant?: 'pink' | 'cyan';
}

// Neon: solid neon color with a pulsing glow that flickers softly (1.8s loop, ease-in-out).
export function NeonName({ name, fontSize, fontWeight, variant = 'pink' }: Props) {
  const core = variant === 'cyan' ? '#22D3EE' : NEON_CORE;
  const glow = variant === 'cyan' ? '#06B6D4' : NEON_GLOW;

  const pulse = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    pulseLoop.start();

    // Soft random flicker every few seconds — neon-sign style.
    let cancelled = false;
    const doFlicker = () => {
      if (cancelled) return;
      const delay = 2000 + Math.random() * 3500;
      setTimeout(() => {
        if (cancelled) return;
        Animated.sequence([
          Animated.timing(flicker, { toValue: 0.4, duration: 60, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 0.7, duration: 50, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start(doFlicker);
      }, delay);
    };
    doFlicker();

    return () => {
      cancelled = true;
      pulseLoop.stop();
    };
  }, [pulse, flicker]);

  const shadowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, 20] });

  return (
    <Animated.View style={{ opacity: flicker }}>
      <Animated.Text
        allowFontScaling={false}
        style={{
          fontSize,
          fontWeight: fontWeight as any,
          color: core,
          textShadowColor: glow,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: shadowRadius as any,
          writingDirection: 'auto',
        }}
      >
        {name}
      </Animated.Text>
    </Animated.View>
  );
}
