import React from 'react';
import type { ColorEffectId } from './effects';
import { StaticName } from './StaticName';
import { RainbowName } from './RainbowName';
import { GoldName } from './GoldName';
import { NeonName } from './NeonName';
import { FireName } from './FireName';
import { IceName } from './IceName';

export type { ColorEffectId } from './effects';

interface Props {
  name: string;
  colorEffect?: ColorEffectId | string | null;
  fontSize?: number;
  fontWeight?: string;
  /** Render the first frame of the effect as a still image. Useful for dense lists. */
  static?: boolean;
}

// Set of effects that actually animate. Anything else falls through to StaticName.
const ANIMATED_EFFECTS = new Set<ColorEffectId>(['rainbow', 'gold', 'neon', 'fire', 'ice']);

export function AnimatedPlayerName({
  name,
  colorEffect,
  fontSize = 18,
  fontWeight = '700',
  static: isStatic = false,
}: Props) {
  const effect = (colorEffect || 'default') as ColorEffectId;
  const safeName = name || '';

  if (!safeName) return null;

  if (isStatic || !ANIMATED_EFFECTS.has(effect)) {
    return <StaticName name={safeName} colorEffect={effect} fontSize={fontSize} fontWeight={fontWeight} />;
  }

  switch (effect) {
    case 'rainbow': return <RainbowName name={safeName} fontSize={fontSize} fontWeight={fontWeight} />;
    case 'gold':    return <GoldName name={safeName} fontSize={fontSize} fontWeight={fontWeight} />;
    case 'neon':    return <NeonName name={safeName} fontSize={fontSize} fontWeight={fontWeight} />;
    case 'fire':    return <FireName name={safeName} fontSize={fontSize} fontWeight={fontWeight} />;
    case 'ice':     return <IceName name={safeName} fontSize={fontSize} fontWeight={fontWeight} />;
    default:
      return <StaticName name={safeName} colorEffect={effect} fontSize={fontSize} fontWeight={fontWeight} />;
  }
}
