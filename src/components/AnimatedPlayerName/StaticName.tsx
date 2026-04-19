import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SOLID_COLORS, GOLD_MID, NEON_CORE, RAINBOW_STOPS, FIRE_STOPS, ICE_STOPS, type ColorEffectId } from './effects';

interface Props {
  name: string;
  colorEffect: ColorEffectId;
  fontSize: number;
  fontWeight: string;
}

// Renders a non-animated snapshot of any effect. Used for:
//   - `default` and legacy solid colors (red/cyan/green/pink)
//   - `static={true}` on any effect (dense lists, perf escape hatch)
export function StaticName({ name, colorEffect, fontSize, fontWeight }: Props) {
  if (colorEffect === 'rainbow') {
    const chars = name.split('');
    return (
      <Text style={{ fontSize, fontWeight: fontWeight as any, writingDirection: 'auto' }} allowFontScaling={false}>
        {chars.map((c, i) => (
          <Text key={i} style={{ color: RAINBOW_STOPS[i % RAINBOW_STOPS.length] }}>{c}</Text>
        ))}
      </Text>
    );
  }

  if (colorEffect === 'fire') {
    const chars = name.split('');
    return (
      <Text style={{ fontSize, fontWeight: fontWeight as any, writingDirection: 'auto' }} allowFontScaling={false}>
        {chars.map((c, i) => (
          <Text key={i} style={{ color: FIRE_STOPS[i % FIRE_STOPS.length] }}>{c}</Text>
        ))}
      </Text>
    );
  }

  if (colorEffect === 'ice') {
    const chars = name.split('');
    return (
      <Text style={{ fontSize, fontWeight: fontWeight as any, writingDirection: 'auto' }} allowFontScaling={false}>
        {chars.map((c, i) => (
          <Text key={i} style={{ color: ICE_STOPS[i % ICE_STOPS.length] }}>{c}</Text>
        ))}
      </Text>
    );
  }

  const color =
    colorEffect === 'gold' ? GOLD_MID
    : colorEffect === 'neon' ? NEON_CORE
    : SOLID_COLORS[colorEffect] || '#FFFFFF';

  return (
    <Text
      style={[styles.base, { fontSize, fontWeight: fontWeight as any, color, writingDirection: 'auto' }]}
      allowFontScaling={false}
    >
      {name}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false } as any,
});
