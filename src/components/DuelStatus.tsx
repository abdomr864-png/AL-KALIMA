import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { toArabicNumerals } from '../engine/ShareCard';
import { COLORS } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';

interface Props {
  myAttempts: number;
  opponentAttempts: number;
  myAvatarColor?: string;
  opponentAvatarColor?: string;
  elapsedSeconds: number;
}

export function DuelStatus({
  myAttempts,
  opponentAttempts,
  myAvatarColor = COLORS.PURPLE,
  opponentAvatarColor = COLORS.AMBER,
  elapsedSeconds,
}: Props) {
  const { t, isEnglish } = useLanguage();
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.playerSide}>
        <View style={[styles.avatar, { backgroundColor: myAvatarColor }]}>
          <Text style={styles.avatarText}>{t('أنت', 'You')}</Text>
        </View>
        <Text style={styles.attempts}>{isEnglish ? myAttempts : toArabicNumerals(myAttempts)}</Text>
      </View>

      <View style={styles.center}>
        <Text style={styles.vs}>VS</Text>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <View style={styles.playerSide}>
        <Text style={styles.attempts}>{isEnglish ? opponentAttempts : toArabicNumerals(opponentAttempts)}</Text>
        <View style={[styles.avatar, { backgroundColor: opponentAvatarColor }]}>
          <Text style={styles.avatarText}>؟</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  playerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: 'bold',
  },
  attempts: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: 'bold',
  },
  center: {
    alignItems: 'center',
  },
  vs: {
    color: COLORS.PURPLE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timer: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
  },
});
