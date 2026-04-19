import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { ArabicKeyboard } from '../src/components/ArabicKeyboard';
import { EnglishKeyboard } from '../src/components/EnglishKeyboard';
import { useLanguage } from '../src/lib/LanguageContext';
import { isValidEnglishWord, getRandomEnglishWord } from '../src/lib/words_en';
import { WordEngine, type GameState, type LetterResult } from '../src/engine/WordEngine';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { getRandomWord, isValidWord } from '../src/lib/words';
import { useCoins } from '../src/hooks/useCoins';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { GAME } from '../src/lib/constants';
import { GameResultScreen } from '../src/components/GameResultScreen';

const { width: SW, height: SH } = Dimensions.get('window');
const HEADER_H = 56;
const CELL_GAP = 8;
const GRID_PADDING = 24;

export default function BlindScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { balance, spendCoins, earnCoins } = useCoins();
  const { language, t, isEnglish } = useLanguage();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'reveal' | 'result'>('intro');
  const [game, setGame] = useState<GameState | null>(null);
  const [shake, setShake] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);

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

  async function startGame() {
    const success = await spendCoins(20);
    if (!success) {
      showToast(t('لا تملك عملات كافية (🪙20)', 'Not enough coins (🪙20)'), 'error');
      return;
    }
    const word = language === 'en' ? getRandomEnglishWord().word : getRandomWord(5);
    setGame(WordEngine.createGame(word, 6));
    setShowResults(false);
    setPhase('playing');
  }

  function addLetter(letter: string) {
    if (!game || game.gameStatus !== 'playing') return;
    if (game.currentGuess.length >= game.targetWord.length) return;
    setGame(prev => prev ? { ...prev, currentGuess: prev.currentGuess + letter } : prev);
  }

  function deleteLetter() {
    if (!game || game.gameStatus !== 'playing') return;
    setGame(prev => prev ? { ...prev, currentGuess: prev.currentGuess.slice(0, -1) } : prev);
  }

  function submitGuess() {
    if (!game || game.gameStatus !== 'playing') return;
    if (game.currentGuess.length < game.targetWord.length) {
      showToast(t('أكمل الكلمة أولاً ✏️', 'Complete the word first ✏️'), 'info');
      return;
    }
    const wordValid = language === 'en' ? isValidEnglishWord(game.currentGuess) : isValidWord(game.currentGuess);
    if (!wordValid) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      showToast(t('كلمة غير صالحة', 'Invalid word'), 'error');
      return;
    }
    const newState = WordEngine.submitGuess(game);
    setGame(newState);

    if (newState.gameStatus === 'won' || newState.gameStatus === 'lost') {
      // Dramatic reveal after a delay
      setTimeout(() => {
        setShowResults(true);
        setPhase('result');
        setShowResultScreen(true);
        if (newState.gameStatus === 'won') {
          const unusedAttempts = 6 - newState.attempts;
          const points = 1000 + unusedAttempts * 200;
          earnCoins(30, 'classic_word');
          showToast(t(`أحسنت! +${points} نقطة • +🪙30`, `Well done! +${points} pts • +🪙30`), 'success', 4000);
        } else {
          showToast(t(`كان الجواب: ${newState.targetWord}`, `The answer was: ${newState.targetWord}`), 'error', 4000);
        }
      }, 800);
    }
  }

  // ─── Blind Grid (custom - no colors during game) ───
  function BlindGrid() {
    if (!game) return null;
    const wordLength = game.targetWord.length;
    const cellByWidth = Math.floor((SW - 32 - (wordLength - 1) * 6) / wordLength);
    const gridAreaHeight = (SH - 60) * 0.42;
    const cellByHeight = Math.floor((gridAreaHeight - CELL_GAP * 5) / 6);
    const cellSize = Math.min(cellByWidth, cellByHeight, 80);

    const shakeX = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
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
    for (let row = 0; row < 6; row++) {
      const isGuessed = row < game.guesses.length;
      const isCurrentRow = row === game.guesses.length && game.gameStatus === 'playing';
      const letters: string[] = [];

      if (isGuessed) {
        letters.push(...[...game.guesses[row]]);
      } else if (isCurrentRow) {
        const current = [...game.currentGuess];
        for (let c = 0; c < wordLength; c++) letters.push(current[c] || '');
      } else {
        for (let c = 0; c < wordLength; c++) letters.push('');
      }

      const cells = letters.slice(0, wordLength).map((letter, col) => {
        // Determine color
        let bgColor = cosTheme.colors.emptyCell;
        let borderColor = cosTheme.colors.emptyBorder;

        if (showResults && isGuessed && game.results[row]) {
          const result = game.results[row][col];
          if (result === 'correct') { bgColor = '#22C55E'; borderColor = '#16A34A'; }
          else if (result === 'present') { bgColor = '#F59E0B'; borderColor = '#D97706'; }
          else { bgColor = '#374151'; borderColor = '#4B5563'; }
        } else if (isGuessed) {
          // Blind mode: show letter but no color hints
          bgColor = '#1A1A2E';
          borderColor = '#2D2D50';
        } else if (isCurrentRow && letter) {
          borderColor = cosTheme.colors.activeBorder;
        }

        return (
          <View
            key={`${row}-${col}`}
            style={[
              blindStyles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: bgColor,
                borderColor: borderColor,
                borderRadius: 12,
              },
            ]}
          >
            <Text style={[blindStyles.cellText, { fontSize: cellSize * 0.5 }]}>{letter}</Text>
          </View>
        );
      });

      const rowDir = isEnglish ? 'row' as const : 'row-reverse' as const;
      const rowView = isCurrentRow ? (
        <Animated.View key={row} style={[blindStyles.row, { gap: CELL_GAP, flexDirection: rowDir }, { transform: [{ translateX: shakeX }] }]}>
          {cells}
        </Animated.View>
      ) : (
        <View key={row} style={[blindStyles.row, { gap: CELL_GAP, flexDirection: rowDir }]}>
          {cells}
        </View>
      );
      rows.push(rowView);
    }

    return <View style={[blindStyles.grid, { gap: CELL_GAP }]}>{rows}</View>;
  }

  // ─── INTRO ───
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
        <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('كلمات بالعمياء', 'Blind Mode')}</Text>
          <Text style={styles.headerEmoji}>👁️</Text>
        </View>

        <View style={styles.introContent}>
          <Text style={styles.introEmoji}>👁️</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{t('للمحترفين فقط', 'Pro Only')}</Text>
          </View>
          <Text style={styles.introTitle}>{t('كلمات بالعمياء', 'Blind Mode')}</Text>
          <Text style={styles.introSub}>{t('خمّن الكلمة بدون أي ألوان!', 'Guess the word with no color hints!')}</Text>

          <View style={styles.rulesCard}>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🚫 لا ألوان أثناء اللعب', '🚫 No colors during gameplay')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🚫 لا تلميحات على لوحة المفاتيح', '🚫 No keyboard hints')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🎬 النتائج تظهر دفعة واحدة بعد الانتهاء', '🎬 Results revealed all at once')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🪙 التكلفة: 20 عملة', '🪙 Cost: 20 coins')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🏆 الجائزة: 30 عملة إذا أصبت', '🏆 Reward: 30 coins if you win')}</Text>
          </View>

          <Text style={styles.balanceText}>{t(`رصيدك: 🪙 ${toArabicNumerals(balance)}`, `Balance: 🪙 ${balance}`)}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={startGame}>
            <Text style={styles.primaryBtnText}>{t('ابدأ (🪙20)', 'Start (🪙20)')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── PLAYING / RESULT ───
  // During playing: no keyboard colors. During result: show all.
  const keyboardStates = showResults && game
    ? (isEnglish ? WordEngine.getKeyboardStatesEN(game.guesses, game.results) : WordEngine.getKeyboardStates(game.guesses, game.results))
    : {};
  const canSubmit = game ? game.currentGuess.length === game.targetWord.length : false;

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('كلمات بالعمياء', 'Blind Mode')}</Text>
        <Text style={styles.headerEmoji}>👁️</Text>
      </View>

      {/* Pro badge */}
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View style={styles.proBadgeSmall}>
          <Text style={styles.proBadgeSmallText}>{t('للمحترفين فقط', 'Pro Only')}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isEnglish
            ? `Attempt ${game ? game.guesses.length + (game.gameStatus === 'playing' ? 1 : 0) : 0} of 6`
            : `المحاولة ${toArabicNumerals(game ? game.guesses.length + (game.gameStatus === 'playing' ? 1 : 0) : 0)} من ${toArabicNumerals(6)}`}
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.gridArea}>
        <BlindGrid />
      </View>


      {/* Keyboard */}
      {phase === 'playing' && (
        isEnglish ? (
          <EnglishKeyboard
            onLetterPress={addLetter}
            onDelete={deleteLetter}
            onEnter={submitGuess}
            letterStates={keyboardStates}
            disabled={!game || game.gameStatus !== 'playing'}
            canSubmit={canSubmit}
          />
        ) : (
          <ArabicKeyboard
            onLetterPress={addLetter}
            onDelete={deleteLetter}
            onEnter={submitGuess}
            letterStates={keyboardStates}
            disabled={!game || game.gameStatus !== 'playing'}
            canSubmit={canSubmit}
          />
        )
      )}

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

      {/* Result overlay */}
      {phase === 'result' && game && (
        <GameResultScreen
          visible={showResultScreen}
          isWin={game.gameStatus === 'won'}
          title={game.gameStatus === 'won' ? t('أحسنت!', 'Well Done!') : t('حظاً أوفر', 'Better Luck')}
          subtitle={game.gameStatus === 'won'
            ? t(`أصبت في ${toArabicNumerals(game.attempts)} محاولات`, `Got it in ${game.attempts} attempts`)
            : t(`كان الجواب: ${game.targetWord}`, `The answer was: ${game.targetWord}`)}
          word={game.targetWord}
          stats={game.gameStatus === 'won' ? [
            { label: t('محاولات', 'Tries'), value: toArabicNumerals(game.attempts), icon: '🎯', color: '#7C3AED' },
            { label: t('عملات', 'Coins'), value: '+' + toArabicNumerals(30), icon: '🪙', color: '#F59E0B' },
          ] : []}
          buttons={[
            { label: t('العب مرة أخرى', 'Play Again'), icon: '🔄', onPress: () => { setPhase('intro'); setGame(null); setShowResults(false); setShowResultScreen(false); }, primary: true },
          ]}
        />
      )}
    </View>
  );
}

const blindStyles = StyleSheet.create({
  grid: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: GRID_PADDING, paddingVertical: 8 },
  row: {},
  cell: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontWeight: '800', color: '#FFF' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },
  header: {
    height: HEADER_H,
    flexDirection: 'row-reverse',
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

  // Intro
  introContent: { flex: 1, paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  introEmoji: { fontSize: 64, marginBottom: 12 },
  introTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  introSub: { fontSize: 15, color: '#A78BFA', marginBottom: 24 },
  proBadge: {
    backgroundColor: '#EF4444' + '20',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  proBadgeText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  proBadgeSmall: {
    backgroundColor: '#EF4444' + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proBadgeSmallText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  rulesCard: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  ruleText: { fontSize: 16, color: '#FFF', fontWeight: '600', textAlign: 'right' },
  balanceText: { fontSize: 18, fontWeight: '800', color: '#F59E0B', marginBottom: 16 },

  // Playing
  statusBar: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 13, color: '#6B7280' },
  gridArea: {
    flex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resultActions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  // Toast
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
