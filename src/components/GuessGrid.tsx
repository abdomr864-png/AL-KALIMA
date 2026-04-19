import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { LetterCell } from './LetterCell';
import { type GuessResult } from '../engine/WordEngine';
import { GAME } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';

const { width: SW, height: SH } = Dimensions.get('window');

const GRID_PADDING = 24;
const CELL_GAP = 8;

interface Props {
  wordLength: number;
  guesses: string[];
  results: GuessResult[];
  currentGuess: string;
  shake: boolean;
  maxAttempts?: number;
  gameWon?: boolean;
}

export function GuessGrid({
  wordLength,
  guesses,
  results,
  currentGuess,
  shake,
  maxAttempts = GAME.MAX_ATTEMPTS,
  gameWon = false,
}: Props) {
  const { isEnglish } = useLanguage();
  // Dynamic cell size — 15% bigger, less padding
  const cellByWidth = Math.floor((SW - 32 - (wordLength - 1) * 6) / wordLength);
  const gridAreaHeight = (SH - 60) * 0.42;
  const cellByHeight = Math.floor((gridAreaHeight - CELL_GAP * (maxAttempts - 1)) / maxAttempts);
  const cellSize = Math.min(cellByWidth, cellByHeight, 80);

  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake]);

  const rows = [];
  for (let row = 0; row < maxAttempts; row++) {
    const isGuessed = row < guesses.length;
    const isCurrentRow = row === guesses.length;
    const isWinRow = gameWon && row === guesses.length - 1;
    const letters: string[] = [];

    if (isGuessed) {
      letters.push(...[...guesses[row]]);
    } else if (isCurrentRow) {
      const current = [...currentGuess];
      for (let c = 0; c < wordLength; c++) letters.push(current[c] || '');
    } else {
      for (let c = 0; c < wordLength; c++) letters.push('');
    }

    const cells = letters.slice(0, wordLength).map((letter, col) => (
      <LetterCell
        key={`${row}-${col}`}
        letter={letter}
        result={isGuessed ? results[row]?.[col] : undefined}
        size={cellSize}
        index={col}
        isCurrentRow={isCurrentRow}
        isRevealed={isGuessed}
        isBouncing={isWinRow}
      />
    ));

    const rowDirection = isEnglish ? 'row' as const : 'row-reverse' as const;
    const rowView = isCurrentRow ? (
      <Animated.View key={row} style={[styles.row, { gap: CELL_GAP, flexDirection: rowDirection }, { transform: [{ translateX: shakeX }] }]}>
        {cells}
      </Animated.View>
    ) : (
      <View key={row} style={[styles.row, { gap: CELL_GAP, flexDirection: rowDirection }]}>
        {cells}
      </View>
    );

    rows.push(rowView);
  }

  return <View style={[styles.container, { gap: CELL_GAP }]}>{rows}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
  },
});
