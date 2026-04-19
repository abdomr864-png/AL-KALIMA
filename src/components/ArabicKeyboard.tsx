import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { type LetterResult } from '../engine/WordEngine';
import { WordEngine } from '../engine/WordEngine';
import { useCosmeticStore } from '../store/cosmeticStore';

const { width: SW, height: SH } = Dimensions.get('window');

// Dynamic key sizing
const KB_PADDING = 6;
const KEY_GAP = 4;
const KEY_ROWS = 3;
const KEY_VERT_GAP = 6;
const USABLE_HEIGHT = (SH - 60) * 0.65;
const KEY_H = Math.min(62, Math.floor((USABLE_HEIGHT - KEY_VERT_GAP * (KEY_ROWS - 1) - 28) / KEY_ROWS));

const ROW1 = ['د', 'ج', 'ح', 'خ', 'ه', 'ع', 'غ', 'ف', 'ق', 'ث', 'ص', 'ض'];
const ROW2 = ['ط', 'ك', 'م', 'ن', 'ت', 'ا', 'ل', 'ب', 'ي', 'س', 'ش'];
const ROW3_LETTERS = ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'];

const R1_KEY_W = Math.floor((SW - KB_PADDING * 2 - KEY_GAP * 11) / 12);
const R2_KEY_W = Math.floor((SW - KB_PADDING * 2 - KEY_GAP * 10) / 11);
const SPECIAL_W = Math.floor(R1_KEY_W * 1.55);
const R3_KEY_W = Math.floor((SW - KB_PADDING * 2 - KEY_GAP * 11 - SPECIAL_W * 2) / 10);

const STATE_BG: Record<LetterResult, string> = {
  correct: '#22C55E',
  present: '#F59E0B',
  absent: '#1A1F35',
};
const STATE_BORDER: Record<LetterResult, string> = {
  correct: '#16A34A',
  present: '#D97706',
  absent: '#2A2F45',
};

interface Props {
  onLetterPress: (letter: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  letterStates: Record<string, LetterResult>;
  disabled: boolean;
  canSubmit?: boolean;
}

export function ArabicKeyboard({ onLetterPress, onDelete, onEnter, letterStates, disabled, canSubmit }: Props) {
  const { keyboard: kbSkin } = useCosmeticStore();

  const handlePress = useCallback(
    (key: string) => {
      if (disabled) return;
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      if (key === 'DELETE') onDelete();
      else if (key === 'ENTER') onEnter();
      else onLetterPress(key);
    },
    [disabled, onLetterPress, onDelete, onEnter]
  );

  function renderKey(key: string, width: number) {
    const norm = WordEngine.normalizeLetter(key);
    const state = letterStates[norm];
    const bg = state ? STATE_BG[state] : kbSkin.keyBg;
    const border = state ? STATE_BORDER[state] : kbSkin.keyBorder;
    const textColor = state === 'absent' ? '#6B7280' : kbSkin.keyTextColor;

    return (
      <Pressable
        key={key}
        onPress={() => handlePress(key)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.key,
          {
            width,
            height: KEY_H,
            borderRadius: kbSkin.keyRadius,
            backgroundColor: pressed ? '#2D3A7E' : bg,
            borderColor: border,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        {ROW1.map((k) => renderKey(k, R1_KEY_W))}
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        {ROW2.map((k) => renderKey(k, R2_KEY_W))}
      </View>

      {/* Row 3: DELETE + letters + ENTER */}
      <View style={styles.row}>
        {/* Delete */}
        <Pressable
          onPress={() => handlePress('DELETE')}
          disabled={disabled}
          style={({ pressed }) => [
            styles.key, styles.specialKey,
            {
              width: SPECIAL_W,
              height: KEY_H,
              backgroundColor: pressed ? '#3D2B5E' : '#2D1B4E',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Text style={styles.deleteText}>←</Text>
        </Pressable>

        {ROW3_LETTERS.map((k) => renderKey(k, R3_KEY_W))}

        {/* Enter */}
        <Pressable
          onPress={() => handlePress('ENTER')}
          disabled={disabled}
          style={({ pressed }) => [
            styles.key, styles.specialKey,
            {
              width: SPECIAL_W,
              height: KEY_H,
              backgroundColor: pressed
                ? '#9B5BFF'
                : canSubmit ? '#7C3AED' : '#1E2A5E',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              styles.enterText,
              { color: canSubmit ? '#FFFFFF' : '#4B5563' },
            ]}
          >
            أدخل
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0520',
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: KB_PADDING,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E1E3A',
    gap: KEY_VERT_GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: KEY_GAP,
  },
  key: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  specialKey: {
    borderWidth: 0,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
    includeFontPadding: false,
  },
  deleteText: {
    fontSize: 22,
    color: '#E879F9',
    fontWeight: '700',
  },
  enterText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
