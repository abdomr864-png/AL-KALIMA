import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../lib/LanguageContext';
import { USERNAME_COLORS, type UsernameColor } from './ColoredUsername';
import { AnimatedPlayerName } from './AnimatedPlayerName';

interface Props {
  activeColorId: UsernameColor;
  username: string;
  myGems: number;
  isElite?: boolean;
  onSelect: (color: typeof USERNAME_COLORS[number]) => void;
}

export function UsernameColorPicker({ activeColorId, username, myGems, isElite, onSelect }: Props) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <View style={s.wrapper}>
      <Text style={s.title}>
        {isArabic ? 'لون الاسم' : 'Username Color'}
      </Text>
      <Text style={s.subtitle}>
        {isArabic ? 'يظهر للجميع في المتصدرين والمبارزات · 60💎/شهر' : 'Visible to all on leaderboard & duels · 60💎/month'}
      </Text>

      {/* Live preview */}
      <View style={s.previewBox}>
        <Text style={s.previewLabel}>
          {isArabic ? 'معاينة مباشرة' : 'Live preview'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isElite && <Text style={{ fontSize: 16 }}>👑</Text>}
          <AnimatedPlayerName name={username} colorEffect={activeColorId} fontSize={20} fontWeight="800" />
        </View>
      </View>

      {/* Color grid */}
      <View style={s.grid}>
        {USERNAME_COLORS.map(uc => {
          const isActive = activeColorId === uc.id;
          const canAfford = uc.cost === 0 || myGems >= uc.cost;
          return (
            <TouchableOpacity
              key={uc.id}
              onPress={() => onSelect(uc)}
              activeOpacity={0.8}
              style={[
                s.colorCell,
                {
                  backgroundColor: isActive ? '#2D1B69' : '#1A1A2E',
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? '#7C3AED' : '#2D2D50',
                  opacity: canAfford ? 1 : 0.6,
                },
              ]}
            >
              <View style={s.colorPreview}>
                {uc.color === 'rainbow' ? (
                  <View style={s.rainbowDots}>
                    {['#EF4444', '#F59E0B', '#22C55E', '#3B82F6'].map((c, i) => (
                      <View key={i} style={[s.rainbowDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                ) : (
                  <View style={[s.colorDot, { backgroundColor: uc.color }]} />
                )}
              </View>
              <Text style={s.colorName}>
                {isArabic ? uc.nameAr : uc.nameEn}
              </Text>
              <Text style={s.colorCost}>
                {uc.cost === 0 ? (isArabic ? 'مجاني' : 'Free') : `${uc.cost}💎/mo`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { gap: 10 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  previewBox: {
    backgroundColor: '#0D0730', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2D2D50',
  },
  previewLabel: { color: '#4B5563', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorCell: {
    flexBasis: '30%', flexGrow: 1,
    borderRadius: 14, padding: 12, alignItems: 'center', gap: 6,
  },
  colorPreview: { height: 28, justifyContent: 'center' },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  rainbowDots: { flexDirection: 'row', gap: 3 },
  rainbowDot: { width: 10, height: 10, borderRadius: 5 },
  colorName: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  colorCost: { color: '#6B7280', fontSize: 11 },
});
