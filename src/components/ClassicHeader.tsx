import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../lib/constants';
import { toArabicNumerals } from '../engine/ShareCard';
import { useLanguage } from '../lib/LanguageContext';

interface ClassicHeaderProps {
  sessionScore: number;
  highScore: number;
  isHotStreak: boolean;
  wordsCompleted: number;
  lettersCompleted: number;
  onBack: () => void;
  onLeaderboard: () => void;
}

export function ClassicHeader({
  sessionScore,
  highScore,
  isHotStreak,
  wordsCompleted,
  lettersCompleted,
  onBack,
  onLeaderboard,
}: ClassicHeaderProps) {
  const { t, isEnglish } = useLanguage();
  const scoreAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (sessionScore > 0) {
      Animated.sequence([
        Animated.timing(scoreAnim, { toValue: 1.2, duration: 120, useNativeDriver: true }),
        Animated.timing(scoreAnim, { toValue: 1.0, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [sessionScore]);

  return (
    <View style={styles.header}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backArrow}>›</Text>
      </TouchableOpacity>

      {/* Left: live score + high score */}
      <View style={styles.scoreArea}>
        <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
          <View style={styles.liveScoreRow}>
            {isHotStreak && <Text style={styles.fireEmoji}>🔥</Text>}
            <Text style={styles.sessionScoreNum}>
              {isEnglish ? sessionScore : toArabicNumerals(sessionScore)}
            </Text>
          </View>
        </Animated.View>
        <View style={styles.highScoreRow}>
          <Text style={styles.highScoreIcon}>🏆</Text>
          <Text style={styles.highScoreNum}>
            {isEnglish ? highScore : toArabicNumerals(highScore)}
          </Text>
        </View>
      </View>

      {/* Center: title + progress */}
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('الكلاسيكي', 'Classic')}</Text>
        <Text style={styles.headerSubtitle}>
          {isEnglish
            ? `${wordsCompleted} words · ${lettersCompleted} letters`
            : `${toArabicNumerals(wordsCompleted)} كلمة · ${toArabicNumerals(lettersCompleted)} حرف`}
        </Text>
      </View>

      {/* Right: leaderboard */}
      <TouchableOpacity style={styles.leaderboardBtn} onPress={onLeaderboard}>
        <Text style={styles.leaderboardIcon}>🏅</Text>
        <Text style={styles.leaderboardLabel}>{t('المتصدرون', 'Leaders')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E3A',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },
  scoreArea: {
    alignItems: 'center',
    marginLeft: 10,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fireEmoji: { fontSize: 14 },
  sessionScoreNum: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.GOLD,
  },
  highScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  highScoreIcon: { fontSize: 10 },
  highScoreNum: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  leaderboardBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  leaderboardIcon: { fontSize: 20 },
  leaderboardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
});
