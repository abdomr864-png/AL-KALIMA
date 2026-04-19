import React, { useRef } from 'react';
import { StyleSheet, Text, View, Share, Platform, Pressable } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { type GuessResult } from '../engine/WordEngine';
import { generateEmojiGrid, generateShareText, formatArabicDate, toArabicNumerals } from '../engine/ShareCard';
import { COLORS } from '../lib/constants';
import { AR } from '../lib/strings';

interface Props {
  date: string;
  results: GuessResult[];
  won: boolean;
  attempts: number;
  streak: number;
  targetWord?: string;
}

const EMOJI_MAP = { correct: '🟩', present: '🟨', absent: '⬛' } as const;

export function ResultCard({ date, results, won, attempts, streak, targetWord }: Props) {
  const viewShotRef = useRef<ViewShot>(null);

  async function handleShare() {
    // Try image share first
    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri);
          return;
        }
      }
    } catch { /* fall through to text */ }

    // Fallback to text share
    const text = generateShareText(date, results, won, attempts, streak);
    await Share.share({ message: text });
  }

  const arabicDate = formatArabicDate(date);

  return (
    <View style={styles.wrapper}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.card}>
        <Text style={styles.logo}>{AR.app_name}</Text>
        <Text style={styles.date}>{arabicDate}</Text>

        <View style={styles.emojiGrid}>
          {results.map((row, i) => (
            <View key={i} style={styles.emojiRow}>
              {[...row].reverse().map((r, j) => (
                <Text key={j} style={styles.emoji}>{EMOJI_MAP[r]}</Text>
              ))}
            </View>
          ))}
        </View>

        {won ? (
          <Text style={styles.resultText}>
            {AR.got_it_in} {toArabicNumerals(attempts)} {AR.attempts} ✓
          </Text>
        ) : (
          <View>
            <Text style={styles.resultText}>لم أصب اليوم ✗</Text>
            {targetWord && (
              <Text style={styles.answerText}>{AR.answer_was}: {targetWord}</Text>
            )}
          </View>
        )}

        {streak > 1 && (
          <Text style={styles.streakText}>
            🔥 {toArabicNumerals(streak)} {AR.day_streak}
          </Text>
        )}

        <Text style={styles.footer}>{AR.play_free}</Text>
      </ViewShot>

      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareText}>{AR.share_result}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 16 },
  card: {
    width: 300,
    backgroundColor: COLORS.PRIMARY_BG,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.CELL_BORDER,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.PURPLE,
  },
  date: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  emojiGrid: {
    gap: 4,
    marginVertical: 12,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 4,
  },
  emoji: {
    fontSize: 28,
  },
  resultText: {
    fontSize: 18,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },
  answerText: {
    fontSize: 16,
    color: COLORS.AMBER,
    textAlign: 'center',
    marginTop: 4,
  },
  streakText: {
    fontSize: 16,
    color: COLORS.GOLD,
  },
  footer: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
  },
  shareButton: {
    backgroundColor: COLORS.PURPLE,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  shareText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
