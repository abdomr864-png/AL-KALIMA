import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { toArabicNumerals } from '../engine/ShareCard';
import { COLORS } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';

interface Props {
  streak: number;
  size?: 'small' | 'large';
}

export function StreakBadge({ streak, size = 'small' }: Props) {
  const { t, isEnglish } = useLanguage();
  if (streak < 1) return null;

  const isLarge = size === 'large';
  const num = isEnglish ? String(streak) : toArabicNumerals(streak);

  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <Text style={[styles.text, isLarge && styles.textLarge]}>
        🔥 {num} {t('أيام متتالية', 'day streak')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${COLORS.GOLD}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.GOLD}40`,
  },
  containerLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  text: {
    color: COLORS.GOLD,
    fontSize: 12,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 18,
  },
});
