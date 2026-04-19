import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type UsernameColor =
  | 'default' | 'gold' | 'red' | 'cyan' | 'green' | 'pink'
  | 'rainbow' | 'neon' | 'fire' | 'ice';

const USERNAME_COLOR_MAP: Record<string, string | string[]> = {
  default: '#FFFFFF',
  gold: '#F59E0B',
  red: '#EF4444',
  cyan: '#22D3EE',
  green: '#22C55E',
  pink: '#EC4899',
  rainbow: ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'],
  neon: '#F472B6',
  fire: '#F97316',
  ice: '#A5F3FC',
};

export const USERNAME_COLORS = [
  { id: 'default' as UsernameColor, nameAr: 'افتراضي', nameEn: 'Default', color: '#FFFFFF', cost: 0 },
  { id: 'gold' as UsernameColor, nameAr: 'ذهبي', nameEn: 'Gold', color: '#F59E0B', cost: 60 },
  { id: 'red' as UsernameColor, nameAr: 'أحمر', nameEn: 'Red', color: '#EF4444', cost: 60 },
  { id: 'cyan' as UsernameColor, nameAr: 'سماوي', nameEn: 'Cyan', color: '#22D3EE', cost: 60 },
  { id: 'green' as UsernameColor, nameAr: 'أخضر', nameEn: 'Green', color: '#22C55E', cost: 60 },
  { id: 'pink' as UsernameColor, nameAr: 'وردي', nameEn: 'Pink', color: '#EC4899', cost: 60 },
  { id: 'rainbow' as UsernameColor, nameAr: '🌈 قوس قزح', nameEn: '🌈 Rainbow', color: 'rainbow', cost: 100 },
  { id: 'neon' as UsernameColor, nameAr: '💖 نيون', nameEn: '💖 Neon', color: '#F472B6', cost: 120 },
  { id: 'fire' as UsernameColor, nameAr: '🔥 نار', nameEn: '🔥 Fire', color: '#F97316', cost: 120 },
  { id: 'ice' as UsernameColor, nameAr: '❄️ جليد', nameEn: '❄️ Ice', color: '#A5F3FC', cost: 120 },
];

interface Props {
  username: string;
  colorId: UsernameColor;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
  isElite?: boolean;
}

export function ColoredUsername({ username, colorId, fontSize = 15, fontWeight = '700', isElite = false }: Props) {
  const color = USERNAME_COLOR_MAP[colorId] || '#FFFFFF';

  if (colorId === 'rainbow' && Array.isArray(color)) {
    const letters = username.split('');
    return (
      <View style={styles.container}>
        {letters.map((letter, i) => (
          <Text
            key={i}
            style={{
              color: color[i % color.length],
              fontSize,
              fontWeight,
            }}
          >
            {letter}
          </Text>
        ))}
        {isElite && <Text style={styles.crown}>👑</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={{ color: color as string, fontSize, fontWeight }}>
        {username}
      </Text>
      {isElite && <Text style={styles.crown}>👑</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  crown: { fontSize: 12, marginLeft: 3 },
});
