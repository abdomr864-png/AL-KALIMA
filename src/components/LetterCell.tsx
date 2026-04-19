import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import { type LetterResult } from '../engine/WordEngine';
import { GAME } from '../lib/constants';
import { useCosmeticStore } from '../store/cosmeticStore';

interface Props {
  letter: string;
  result?: LetterResult;
  size: number;
  index: number;
  isCurrentRow: boolean;
  isRevealed: boolean;
  isBouncing: boolean;
}

const RESULT_BG: Record<LetterResult, string> = {
  correct: '#22C55E',
  present: '#F59E0B',
  absent: '#374151',
};

const RESULT_BORDER: Record<LetterResult, string> = {
  correct: '#16A34A',
  present: '#D97706',
  absent: '#4B5563',
};

export function LetterCell({ letter, result, size, index, isCurrentRow, isRevealed, isBouncing }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const flipProgress = useRef(new Animated.Value(0)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const [showColor, setShowColor] = React.useState(false);

  // Pop on type
  useEffect(() => {
    if (letter && isCurrentRow && !isRevealed) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 40, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [letter]);

  // Flip on reveal
  useEffect(() => {
    if (isRevealed && result) {
      const delay = index * 100;
      setTimeout(() => setShowColor(true), delay + 200);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flipProgress, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [isRevealed, result]);

  // Bounce on win
  useEffect(() => {
    if (isBouncing) {
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.timing(bounceY, { toValue: -16, duration: 120, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [isBouncing]);

  const rotateX = flipProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  // Cosmetics
  const { theme, tile } = useCosmeticStore();

  // Colors — apply theme + tile overrides
  let bgColor = theme.colors.emptyCell;
  let borderColor = theme.colors.emptyBorder;
  let textColor = '#FFFFFF';
  let extraShadow = {};

  if (showColor && result) {
    const correctBg = tile.correctColor || RESULT_BG.correct;
    const correctBorder = tile.correctBorder || RESULT_BORDER.correct;
    bgColor = result === 'correct' ? correctBg : RESULT_BG[result];
    borderColor = result === 'correct' ? correctBorder : RESULT_BORDER[result];
    textColor = result === 'absent' ? '#9CA3AF' : '#FFFFFF';
    if (tile.glowEffect) {
      extraShadow = { shadowColor: bgColor, shadowOpacity: 0.8, shadowRadius: 10, elevation: 8 };
    }
    if (tile.opacity) {
      bgColor = bgColor + Math.round(tile.opacity * 255).toString(16).padStart(2, '0');
    }
  } else if (letter && isCurrentRow) {
    borderColor = theme.colors.activeBorder;
  }

  return (
    <Animated.View
      style={[
        styles.cell,
        {
          width: size,
          height: Math.floor(size * 1.08),
          backgroundColor: bgColor,
          borderColor,
          ...(tile.borderRadius ? { borderRadius: Math.min(tile.borderRadius, size / 2) } : {}),
          ...extraShadow,
          transform: [
            { scale },
            { perspective: 800 },
            { rotateX },
            { translateY: bounceY },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            fontSize: size * 0.52,
            color: textColor,
            fontWeight: showColor ? '900' : '800',
          },
        ]}
      >
        {letter}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
