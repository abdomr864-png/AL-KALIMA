import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { GuessGrid } from '../src/components/GuessGrid';
import { ArabicKeyboard } from '../src/components/ArabicKeyboard';
import { EnglishKeyboard } from '../src/components/EnglishKeyboard';
import { useLanguage } from '../src/lib/LanguageContext';
import { isValidEnglishWord } from '../src/lib/words_en';
import { WordEngine, type GameState } from '../src/engine/WordEngine';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { WORDS_5, isValidWord } from '../src/lib/words';
import { WORDS_EN_5 } from '../src/lib/words_en';
import { useCoins } from '../src/hooks/useCoins';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { GAME } from '../src/lib/constants';
import { GameResultScreen } from '../src/components/GameResultScreen';

const HEADER_H = 56;

function getHourlyWord(lang: 'ar' | 'en'): { word: string; hourKey: string } {
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
  const hash = hourKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  if (lang === 'en') {
    const entry = WORDS_EN_5[hash % WORDS_EN_5.length];
    return { word: entry.word, hourKey };
  }
  const word = WORDS_5[hash % WORDS_5.length];
  return { word, hourKey };
}

function getTimeUntilNextHour(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

export default function RushScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { earnCoins } = useCoins();
  const { language, t, isEnglish } = useLanguage();
  const [hourlyWord] = useState(() => getHourlyWord(language));
  const [game, setGame] = useState<GameState>(() => WordEngine.createGame(hourlyWord.word, 6));
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameDuration, setGameDuration] = useState(0);
  const gameStartTime = useRef(Date.now());

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info', duration = 1800) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ msg, type });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const ms = getTimeUntilNextHour();
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
      setCountdown(`${m}:${s}`);
      setProgress(1 - ms / 3600000);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  function addLetter(letter: string) {
    if (game.gameStatus !== 'playing') return;
    if (game.currentGuess.length >= game.targetWord.length) return;
    setGame(prev => ({ ...prev, currentGuess: prev.currentGuess + letter }));
  }

  function deleteLetter() {
    if (game.gameStatus !== 'playing') return;
    setGame(prev => ({ ...prev, currentGuess: prev.currentGuess.slice(0, -1) }));
  }

  function submitGuess() {
    if (game.gameStatus !== 'playing') return;
    if (game.currentGuess.length < game.targetWord.length) {
      showToast(isEnglish ? 'Not enough letters ✏️' : 'أكمل الكلمة أولاً ✏️', 'info');
      return;
    }
    const wordValid = language === 'en' ? isValidEnglishWord(game.currentGuess) : isValidWord(game.currentGuess);
    if (!wordValid) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      showToast(isEnglish ? 'Not in word list ❌' : 'كلمة غير صالحة', 'error');
      return;
    }
    const newState = WordEngine.submitGuess(game);
    setGame(newState);
    if (newState.gameStatus === 'won') {
      const coins = newState.attempts <= 2 ? 8 : newState.attempts <= 4 ? 5 : 3;
      earnCoins(coins, 'hourly_word');
      setGameDuration(Math.round((Date.now() - gameStartTime.current) / 1000));
      setTimeout(() => setShowResult(true), 1200);
    } else if (newState.gameStatus === 'lost') {
      setGameDuration(Math.round((Date.now() - gameStartTime.current) / 1000));
      setTimeout(() => setShowResult(true), 1200);
    }
  }

  const keyboardStates = isEnglish
    ? WordEngine.getKeyboardStatesEN(game.guesses, game.results)
    : WordEngine.getKeyboardStates(game.guesses, game.results);
  const canSubmit = game.currentGuess.length === game.targetWord.length;

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEnglish ? 'Word Rush' : 'كلمة الساعة'}</Text>
        <Text style={styles.headerEmoji}>⏰</Text>
      </View>

      {/* Timer bar */}
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>{isEnglish ? `Ends in: ${countdown}` : `ينتهي خلال: ${countdown}`}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridArea}>
        <GuessGrid
          wordLength={game.targetWord.length}
          guesses={game.guesses}
          results={game.results}
          currentGuess={game.currentGuess}
          shake={shake}
          gameWon={game.gameStatus === 'won'}
        />
      </View>

      {/* Status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isEnglish
            ? `Attempt ${game.guesses.length + (game.gameStatus === 'playing' ? 1 : 0)} of 6`
            : `المحاولة ${toArabicNumerals(game.guesses.length + (game.gameStatus === 'playing' ? 1 : 0))} من ${toArabicNumerals(6)}`}
        </Text>
      </View>

      {/* Keyboard */}
      {isEnglish ? (
        <EnglishKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={submitGuess}
          letterStates={keyboardStates}
          disabled={game.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      ) : (
        <ArabicKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={submitGuess}
          letterStates={keyboardStates}
          disabled={game.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      )}

      {/* Result screen */}
      <GameResultScreen
        visible={showResult}
        isWin={game.gameStatus === 'won'}
        title={game.gameStatus === 'won' ? t('أصبت!', 'Amazing!') : t('حظاً أوفر', 'Better Luck')}
        subtitle={game.gameStatus === 'won'
          ? (isEnglish ? `Got it in ${game.attempts} attempts` : `أصبت في ${toArabicNumerals(game.attempts)} محاولات`)
          : (isEnglish ? `The answer was: ${game.targetWord}` : `كان الجواب: ${game.targetWord}`)}
        word={game.targetWord}
        stats={[
          { label: t('محاولات', 'Tries'), value: toArabicNumerals(game.attempts), icon: '🎯', color: '#7C3AED' },
          { label: t('ثانية', 'Seconds'), value: toArabicNumerals(gameDuration), icon: '⚡', color: '#22C55E' },
        ]}
        buttons={[]}
        footerText={t('الكلمة التالية خلال ساعة ⏰', 'Next word in an hour ⏰')}
        onClose={() => setShowResult(false)}
      />

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastOpacity },
            toast.type === 'error' && { backgroundColor: '#EF4444' },
            toast.type === 'success' && { backgroundColor: '#22C55E' },
            toast.type === 'info' && { backgroundColor: '#7C3AED' },
          ]}
        >
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },
  header: {
    height: HEADER_H,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerEmoji: { fontSize: 22, width: 36, textAlign: 'center' },
  timerSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  timerLabel: { fontSize: 16, fontWeight: '700', color: '#A78BFA', textAlign: 'center' },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  gridArea: {
    flex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 13, color: '#6B7280' },
  toast: {
    position: 'absolute',
    top: HEADER_H + 12,
    left: 24,
    right: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
