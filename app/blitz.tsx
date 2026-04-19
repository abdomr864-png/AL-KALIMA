import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { GuessGrid } from '../src/components/GuessGrid';
import { ArabicKeyboard } from '../src/components/ArabicKeyboard';
import { EnglishKeyboard } from '../src/components/EnglishKeyboard';
import { useLanguage } from '../src/lib/LanguageContext';
import { isValidEnglishWord } from '../src/lib/words_en';
import { WordEngine, type GameState } from '../src/engine/WordEngine';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { WORDS_5 } from '../src/lib/words';
import { isValidWord } from '../src/lib/words';
import { useCoins } from '../src/hooks/useCoins';
import { GameResultScreen } from '../src/components/GameResultScreen';
import { useCosmeticStore } from '../src/store/cosmeticStore';

const HEADER_H = 56;
const BLITZ_INITIAL_TIME = 90;
const BLITZ_TIME_PER_WORD = 10;
const BLITZ_MAX_ATTEMPTS = 5;

const BLITZ_CATEGORIES = [
  { id: 'food', labelAr: 'طعام', labelEn: 'Food', emoji: '🍽️', color: '#D97706', startIdx: 0, endIdx: 19 },
  { id: 'animals', labelAr: 'حيوانات', labelEn: 'Animals', emoji: '🐾', color: '#16A34A', startIdx: 140, endIdx: 159 },
  { id: 'nature', labelAr: 'طبيعة', labelEn: 'Nature', emoji: '🌿', color: '#0891B2', startIdx: 40, endIdx: 64 },
  { id: 'body', labelAr: 'جسم', labelEn: 'Body', emoji: '💪', color: '#DC2626', startIdx: 65, endIdx: 79 },
  { id: 'sports', labelAr: 'رياضة', labelEn: 'Sports', emoji: '⚽', color: '#7C3AED', startIdx: 115, endIdx: 139 },
  { id: 'random', labelAr: 'عشوائي', labelEn: 'Random', emoji: '🎲', color: '#6B7280', startIdx: 0, endIdx: WORDS_5.length - 1 },
];

function getWordForCategory(cat: typeof BLITZ_CATEGORIES[number], usedWords: Set<string>): string {
  const pool = WORDS_5.slice(cat.startIdx, cat.endIdx + 1).filter(w => !usedWords.has(w));
  if (pool.length === 0) return WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function BlitzScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { earnCoins } = useCoins();
  const { language, t, isEnglish } = useLanguage();
  const [phase, setPhase] = useState<'select' | 'playing' | 'ended'>('select');
  const [category, setCategory] = useState(BLITZ_CATEGORIES[0]);
  const [timeLeft, setTimeLeft] = useState(BLITZ_INITIAL_TIME);
  const [wordsSolved, setWordsSolved] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);
  const [shake, setShake] = useState(false);
  const usedWordsRef = useRef(new Set<string>());

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info', duration = 1500) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ msg, type });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }

  function startGame(cat: typeof BLITZ_CATEGORIES[number]) {
    setCategory(cat);
    setPhase('playing');
    setTimeLeft(BLITZ_INITIAL_TIME);
    setWordsSolved(0);
    usedWordsRef.current.clear();
    loadNextWord(cat);
  }

  function loadNextWord(cat: typeof BLITZ_CATEGORIES[number]) {
    const word = getWordForCategory(cat, usedWordsRef.current);
    usedWordsRef.current.add(word);
    setGame(WordEngine.createGame(word, BLITZ_MAX_ATTEMPTS));
    setShake(false);
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('ended');
      const coins = wordsSolved * 3;
      if (coins > 0) earnCoins(coins, 'classic_word');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

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

    if (newState.gameStatus === 'won') {
      setWordsSolved(prev => prev + 1);
      setTimeLeft(prev => prev + BLITZ_TIME_PER_WORD);
      showToast(t(`✓ +${BLITZ_TIME_PER_WORD} ثانية`, `✓ +${BLITZ_TIME_PER_WORD}s`), 'success', 1000);
      setTimeout(() => loadNextWord(category), 800);
    } else if (newState.gameStatus === 'lost') {
      showToast(t(`كان الجواب: ${game.targetWord}`, `Answer: ${game.targetWord}`), 'error', 1200);
      setTimeout(() => loadNextWord(category), 1500);
    }
  }

  // ─── CATEGORY SELECT ───
  if (phase === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
        <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('تحدي الفئة', 'Category Blitz')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.selectContent}>
          <Text style={styles.selectTitle}>{t('اختر الفئة', 'Choose Category')}</Text>
          <Text style={styles.selectSub}>{t('90 ثانية — حل أكبر عدد من الكلمات', '90 seconds — solve as many words as you can')}</Text>
          <View style={styles.catGrid}>
            {BLITZ_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, { borderColor: cat.color + '40' }]}
                activeOpacity={0.85}
                onPress={() => startGame(cat)}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catName}>{isEnglish ? cat.labelEn : cat.labelAr}</Text>
                <View style={[styles.catAccent, { backgroundColor: cat.color }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ─── END SCREEN ───
  if (phase === 'ended') {
    const score = wordsSolved * 100;
    const coins = wordsSolved * 3;
    return (
      <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
        <GameResultScreen
          visible={true}
          isWin={wordsSolved > 0}
          title={t('انتهى الوقت!', 'Time\'s Up!')}
          subtitle={t(`حللت ${toArabicNumerals(wordsSolved)} كلمة`, `Solved ${wordsSolved} words`)}
          stats={[
            { label: t('الكلمات', 'Words'), value: toArabicNumerals(wordsSolved), icon: '✅', color: '#22C55E' },
            { label: t('النقاط', 'Score'), value: toArabicNumerals(score), icon: '⭐', color: '#F59E0B' },
            { label: t('العملات', 'Coins'), value: `+${toArabicNumerals(coins)}`, icon: '🪙', color: '#F59E0B' },
          ]}
          buttons={[
            { label: t('العب مرة أخرى', 'Play Again'), icon: '🔄', onPress: () => setPhase('select'), primary: true },
            { label: t('العودة', 'Back'), icon: '←', onPress: () => router.canGoBack() ? router.back() : router.replace('/'), primary: false },
          ]}
        />
      </View>
    );
  }

  // ─── PLAYING ───
  const keyboardStates = game
    ? (isEnglish ? WordEngine.getKeyboardStatesEN(game.guesses, game.results) : WordEngine.getKeyboardStates(game.guesses, game.results))
    : {};
  const canSubmit = game ? game.currentGuess.length === game.targetWord.length : false;
  const timerColor = timeLeft <= 30 ? '#EF4444' : timeLeft <= 60 ? '#F59E0B' : '#22C55E';

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setPhase('ended'); }}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('تحدي الفئة', 'Category Blitz')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Category + Timer */}
      <View style={styles.playingTop}>
        <View style={[styles.catPill, { backgroundColor: category.color + '18', borderColor: category.color + '40' }]}>
          <Text>{category.emoji}</Text>
          <Text style={[styles.catPillText, { color: category.color }]}>{isEnglish ? category.labelEn : category.labelAr}</Text>
        </View>
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, { color: timerColor }]}>
            ⏱ {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
          <Text style={styles.solvedText}>✓ {toArabicNumerals(wordsSolved)}</Text>
        </View>
        <View style={styles.timerBarBg}>
          <View style={[styles.timerBarFill, { width: `${Math.min((timeLeft / BLITZ_INITIAL_TIME) * 100, 100)}%`, backgroundColor: timerColor }]} />
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridArea}>
        {game && (
          <GuessGrid
            wordLength={game.targetWord.length}
            guesses={game.guesses}
            results={game.results}
            currentGuess={game.currentGuess}
            shake={shake}
            maxAttempts={BLITZ_MAX_ATTEMPTS}
            gameWon={game.gameStatus === 'won'}
          />
        )}
      </View>

      {/* Keyboard */}
      {isEnglish ? (
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

  // Select phase
  selectContent: { flex: 1, paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  selectTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  selectSub: { fontSize: 15, color: '#A78BFA', marginBottom: 28 },
  catGrid: {
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  catCard: {
    width: 150,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  catEmoji: { fontSize: 36 },
  catName: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  catAccent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },

  // Playing phase
  playingTop: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  catPill: {
    alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, alignSelf: 'center',
  },
  catPillText: { fontSize: 14, fontWeight: '700' },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerText: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  solvedText: { fontSize: 18, fontWeight: '800', color: '#22C55E' },
  timerBarBg: {
    width: '100%', height: 6, backgroundColor: '#1A1A2E',
    borderRadius: 3, overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%', borderRadius: 3,
  },
  gridArea: {
    flex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
