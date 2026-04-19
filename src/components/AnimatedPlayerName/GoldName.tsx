import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { GOLD_DARK, GOLD_MID, GOLD_BRIGHT } from './effects';

interface Props {
  name: string;
  fontSize: number;
  fontWeight: string;
}

// Gold: metallic base (dark → mid → dark) with a bright shimmer band sweeping across.
// 1.5s sweep + 1s pause = 2.5s loop.
export function GoldName({ name, fontSize, fontWeight }: Props) {
  // sweep advances letter-by-letter during the active phase, then holds during the pause.
  const sweep = useRef(new Animated.Value(0)).current;

  const chars = useMemo(() => name.split(''), [name]);
  // Sweep travels from -1 to chars.length+1, covering a small margin before/after
  const sweepEnd = chars.length + 1;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: sweepEnd, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.delay(1000),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, sweepEnd]);

  // Shimmer is a bell curve centered on `sweep`. Letter i gets bright color when sweep ≈ i.
  // We use a 3-point interpolation (dark .. bright .. dark) with the peak at i.
  const letterColor = (i: number) =>
    sweep.interpolate({
      inputRange: [i - 1.5, i - 0.3, i, i + 0.3, i + 1.5, sweepEnd + 0.1],
      outputRange: [GOLD_MID, GOLD_BRIGHT, '#FFFFFF', GOLD_BRIGHT, GOLD_DARK, GOLD_MID],
      extrapolate: 'clamp',
    }) as any;

  // Base breathing shadow — a softer, slower glow on top of the sweep.
  const shadow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(shadow, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(shadow, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [shadow]);
  const shadowRadius = shadow.interpolate({ inputRange: [0, 1], outputRange: [3, 8] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {chars.map((c, i) => (
        <Animated.Text
          key={i}
          allowFontScaling={false}
          style={{
            fontSize,
            fontWeight: fontWeight as any,
            color: letterColor(i),
            textShadowColor: GOLD_BRIGHT,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: shadowRadius as any,
          }}
        >
          {c}
        </Animated.Text>
      ))}
    </View>
  );
}
