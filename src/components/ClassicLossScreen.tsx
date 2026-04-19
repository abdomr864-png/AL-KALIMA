import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
} from 'react-native';
import { COLORS } from '../lib/constants';
import { toArabicNumerals } from '../engine/ShareCard';

interface ClassicLossScreenProps {
  finalScore: number;
  highScore: number;
  isNewHighScore: boolean;
  correctWord: string;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
}

export function ClassicLossScreen({
  finalScore,
  highScore,
  isNewHighScore,
  correctWord,
  onPlayAgain,
  onLeaderboard,
}: ClassicLossScreenProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Game over icon */}
      <Text style={styles.bigEmoji}>💔</Text>

      <Text style={styles.title}>انتهت اللعبة</Text>
      <Text style={styles.subtitle}>
        كانت الكلمة: <Text style={styles.correctWord}>{correctWord}</Text>
      </Text>

      {/* Score cards */}
      <View style={styles.cardsRow}>
        {/* Session score */}
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>⭐</Text>
          <Text style={styles.cardScore}>{toArabicNumerals(finalScore)}</Text>
          <Text style={styles.cardLabel}>نقاط الجلسة</Text>
        </View>

        {/* High score */}
        <View style={[styles.card, isNewHighScore && styles.cardGold]}>
          <Text style={styles.cardEmoji}>🏆</Text>
          <Text style={[styles.cardScore, isNewHighScore && styles.goldText]}>
            {toArabicNumerals(highScore)}
          </Text>
          <Text style={styles.cardLabel}>
            {isNewHighScore ? '🎉 رقم قياسي!' : 'أعلى نقاط'}
          </Text>
        </View>
      </View>

      {/* Play again button */}
      <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain}>
        <Text style={styles.playAgainText}>🔄  العب مجدداً</Text>
      </TouchableOpacity>

      {/* Leaderboard button */}
      <TouchableOpacity style={styles.leaderboardBtn} onPress={onLeaderboard}>
        <Text style={styles.leaderboardText}>🏅  شاهد المتصدرين</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bigEmoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: COLORS.TEXT_SECONDARY, marginBottom: 24,
  },
  correctWord: {
    fontWeight: '800', color: COLORS.PURPLE_LIGHT,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    flex: 1,
    backgroundColor: '#1E1E3A',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  cardGold: {
    borderColor: COLORS.GOLD,
    borderWidth: 2,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardScore: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  goldText: { color: COLORS.GOLD },
  cardLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.TEXT_SECONDARY, marginTop: 4,
  },
  playAgainBtn: {
    backgroundColor: COLORS.PURPLE,
    height: 54,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playAgainText: {
    color: '#FFF', fontSize: 18, fontWeight: '800',
  },
  leaderboardBtn: {
    backgroundColor: '#1E1E3A',
    height: 48,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  leaderboardText: {
    color: COLORS.TEXT_SECONDARY, fontSize: 16, fontWeight: '700',
  },
});
