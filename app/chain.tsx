import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { WordEngine } from '../src/engine/WordEngine';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { isValidWord } from '../src/lib/words';
import { useLanguage } from '../src/lib/LanguageContext';
import { isValidEnglishWord } from '../src/lib/words_en';
import { WORDS_3, WORDS_4 } from '../src/lib/categories';
import { WORDS_5 } from '../src/lib/words';
import { useCoins } from '../src/hooks/useCoins';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { GameResultScreen } from '../src/components/GameResultScreen';

const HEADER_H = 56;
const TURN_TIME = 15;

// Build a dictionary lookup for chain words (3-5 letters)
const ALL_CHAIN_WORDS = [
  ...WORDS_3.map(w => w.word),
  ...WORDS_4.map(w => w.word),
  ...WORDS_5,
];

// Group words by first letter (normalized)
const WORDS_BY_FIRST_LETTER: Record<string, string[]> = {};
ALL_CHAIN_WORDS.forEach(word => {
  const first = WordEngine.normalizeLetter(word[0]);
  if (!WORDS_BY_FIRST_LETTER[first]) WORDS_BY_FIRST_LETTER[first] = [];
  WORDS_BY_FIRST_LETTER[first].push(word);
});

const AI_NAMES_AR = ['سارة', 'أحمد', 'نورة'];
const AI_NAMES_EN = ['Sara', 'Ahmed', 'Nora'];

function getLastLetter(word: string): string {
  return WordEngine.normalizeLetter(word[word.length - 1]);
}

function getRandomAIWord(requiredFirstLetter: string, usedWords: Set<string>): string | null {
  const candidates = (WORDS_BY_FIRST_LETTER[requiredFirstLetter] || []).filter(w => !usedWords.has(w));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function ChainScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { earnCoins } = useCoins();
  const { language, t, isEnglish } = useLanguage();
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'ended'>('lobby');
  const [chain, setChain] = useState<{ word: string; player: string }[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 = user, 1-3 = AI
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TURN_TIME);
  const [lives, setLives] = useState([3, 3, 3, 3]); // user + 3 AI
  const [eliminated, setEliminated] = useState([false, false, false, false]);
  const usedWordsRef = useRef(new Set<string>());
  const chainScrollRef = useRef<ScrollView>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const aiNames = isEnglish ? AI_NAMES_EN : AI_NAMES_AR;
  const players = [isEnglish ? 'You' : 'أنت', ...aiNames];
  const playerColors = ['#7C3AED', '#F59E0B', '#22C55E', '#0EA5E9'];

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

  function startGame() {
    // Pick a random starting word
    const startWord = WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
    usedWordsRef.current.clear();
    usedWordsRef.current.add(startWord);
    setChain([{ word: startWord, player: isEnglish ? 'Start' : 'بداية' }]);
    setCurrentPlayer(0);
    setLives([3, 3, 3, 3]);
    setEliminated([false, false, false, false]);
    setInput('');
    setTimeLeft(TURN_TIME);
    setPhase('playing');
  }

  function getRequiredLetter(): string {
    if (chain.length === 0) return '';
    return getLastLetter(chain[chain.length - 1].word);
  }

  function getNextPlayer(current: number): number {
    let next = (current + 1) % 4;
    let attempts = 0;
    while (eliminated[next] && attempts < 4) {
      next = (next + 1) % 4;
      attempts++;
    }
    return next;
  }

  function getActivePlayers(): number {
    return eliminated.filter(e => !e).length;
  }

  function loseLife(playerIdx: number) {
    const newLives = [...lives];
    newLives[playerIdx]--;
    setLives(newLives);

    if (newLives[playerIdx] <= 0) {
      const newEliminated = [...eliminated];
      newEliminated[playerIdx] = true;
      setEliminated(newEliminated);
      showToast(t(`${players[playerIdx]} خرج من اللعبة!`, `${players[playerIdx]} eliminated!`), 'error');

      // Check if game is over
      const remaining = newEliminated.filter(e => !e).length;
      if (remaining <= 1 || newEliminated[0]) {
        setTimeout(() => setPhase('ended'), 1000);
        return;
      }
    }
  }

  // Timer for current turn
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      // Time's up for current player
      loseLife(currentPlayer);
      if (phase === 'playing') {
        const next = getNextPlayer(currentPlayer);
        setCurrentPlayer(next);
        setTimeLeft(TURN_TIME);
        setInput('');
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft, currentPlayer]);

  // AI turns
  useEffect(() => {
    if (phase !== 'playing') return;
    if (currentPlayer === 0) return; // user's turn
    if (eliminated[currentPlayer]) {
      const next = getNextPlayer(currentPlayer);
      setCurrentPlayer(next);
      setTimeLeft(TURN_TIME);
      return;
    }

    const delay = 1500 + Math.random() * 2000; // 1.5-3.5s thinking time
    const timer = setTimeout(() => {
      const required = getRequiredLetter();
      const word = getRandomAIWord(required, usedWordsRef.current);
      if (word) {
        usedWordsRef.current.add(word);
        setChain(prev => [...prev, { word, player: players[currentPlayer] }]);
        const next = getNextPlayer(currentPlayer);
        setCurrentPlayer(next);
        setTimeLeft(TURN_TIME);
      } else {
        loseLife(currentPlayer);
        const next = getNextPlayer(currentPlayer);
        setCurrentPlayer(next);
        setTimeLeft(TURN_TIME);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [currentPlayer, phase]);

  function submitWord() {
    if (currentPlayer !== 0 || !input.trim()) return;
    const word = input.trim();
    const required = getRequiredLetter();

    // Validate
    const firstNorm = WordEngine.normalizeLetter(word[0]);
    if (firstNorm !== required) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      showToast(t(`يجب أن تبدأ بحرف: ${required}`, `Must start with: ${required}`), 'error');
      return;
    }

    const wordValid = language === 'en' ? isValidEnglishWord(word) : isValidWord(word);
    if (!wordValid) {
      showToast(t('كلمة غير صالحة', 'Invalid word'), 'error');
      return;
    }

    if (usedWordsRef.current.has(word)) {
      showToast(t('هذه الكلمة استُخدمت بالفعل', 'Word already used'), 'error');
      return;
    }

    usedWordsRef.current.add(word);
    setChain(prev => [...prev, { word, player: players[0] }]);
    setInput('');
    const next = getNextPlayer(0);
    setCurrentPlayer(next);
    setTimeLeft(TURN_TIME);
  }

  // ─── LOBBY ───
  if (phase === 'lobby') {
    return (
      <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
        <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('الكلمة المتسلسلة', 'Word Chain')}</Text>
          <Text style={styles.headerEmoji}>🔗</Text>
        </View>

        <View style={styles.lobbyContent}>
          <Text style={styles.lobbyEmoji}>🔗</Text>
          <Text style={styles.lobbyTitle}>{t('الكلمة المتسلسلة', 'Word Chain')}</Text>
          <Text style={styles.lobbySub}>{t('آخر حرف من كل كلمة = أول حرف من التالية', 'Last letter of each word = first letter of the next')}</Text>

          <View style={styles.rulesCard}>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t(`⏱ ${toArabicNumerals(TURN_TIME)} ثانية لكل دور`, `⏱ ${TURN_TIME} seconds per turn`)}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('❤️ 3 حيوات لكل لاعب', '❤️ 3 lives per player')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🤖 3 خصوم ذكاء اصطناعي', '🤖 3 AI opponents')}</Text>
            <Text style={[styles.ruleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('🏆 آخر لاعب يفوز', '🏆 Last player standing wins')}</Text>
          </View>

          <View style={styles.playersRow}>
            {players.map((name, i) => (
              <View key={i} style={[styles.playerChip, { borderColor: playerColors[i] }]}>
                <Text style={[styles.playerChipText, { color: playerColors[i] }]}>{name}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={startGame}>
            <Text style={styles.primaryBtnText}>{t('ابدأ اللعب', 'Start Game')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── ENDED ───
  if (phase === 'ended') {
    const userWon = !eliminated[0];
    const userWords = chain.filter(c => c.player === players[0]).length;
    const coins = userWon ? 10 : userWords * 1;
    if (coins > 0) earnCoins(coins, 'classic_word');

    return (
      <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
        <GameResultScreen
          visible={true}
          isWin={userWon}
          title={userWon ? t('فزت!', 'You Won!') : t('حظاً أوفر', 'Better Luck')}
          subtitle={t(`سلسلة من ${toArabicNumerals(chain.length)} كلمة`, `Chain of ${chain.length} words`)}
          stats={[
            { label: t('السلسلة', 'Chain'), value: toArabicNumerals(chain.length), icon: '🔗', color: '#7C3AED' },
            { label: t('كلماتك', 'Your Words'), value: toArabicNumerals(userWords), icon: '✍️', color: '#22C55E' },
            { label: t('العملات', 'Coins'), value: `+${toArabicNumerals(coins)}`, icon: '🪙', color: '#F59E0B' },
          ]}
          buttons={[
            { label: t('العب مرة أخرى', 'Play Again'), icon: '🔄', onPress: () => setPhase('lobby'), primary: true },
          ]}
        />
      </View>
    );
  }

  // ─── PLAYING ───
  const requiredLetter = getRequiredLetter();
  const isMyTurn = currentPlayer === 0;

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setPhase('ended')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('الكلمة المتسلسلة', 'Word Chain')}</Text>
        <Text style={styles.headerEmoji}>🔗</Text>
      </View>

      {/* Players bar */}
      <View style={[styles.playersBar, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        {players.map((name, i) => (
          <View
            key={i}
            style={[
              styles.playerBadge,
              { borderColor: playerColors[i], opacity: eliminated[i] ? 0.3 : 1 },
              currentPlayer === i && { backgroundColor: playerColors[i] + '30' },
            ]}
          >
            <Text style={[styles.playerName, { color: currentPlayer === i ? '#FFF' : playerColors[i] }]}>
              {name}
            </Text>
            <Text style={styles.playerLives}>{'❤️'.repeat(lives[i])}</Text>
          </View>
        ))}
      </View>

      {/* Chain display */}
      <View style={styles.chainSection}>
        <Text style={[styles.chainLabel, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('السلسلة:', 'Chain:')}</Text>
        <ScrollView
          ref={chainScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chainScroll}
          onContentSizeChange={() => chainScrollRef.current?.scrollToEnd({ animated: true })}
        >
          {chain.map((item, i) => (
            <View key={i} style={styles.chainItem}>
              <Text style={styles.chainWord}>{item.word}</Text>
              {i < chain.length - 1 && <Text style={styles.chainArrow}>←</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Current turn info */}
      <View style={styles.turnSection}>
        <Text style={styles.turnLabel}>
          {isMyTurn ? t('دورك!', 'Your turn!') : t(`دور ${players[currentPlayer]}...`, `${players[currentPlayer]}'s turn...`)}
        </Text>
        <Text style={styles.requiredLetter}>{t(`ابدأ بحرف: ${requiredLetter}`, `Start with: ${requiredLetter}`)}</Text>
        <Text style={[styles.turnTimer, timeLeft <= 5 ? { color: '#EF4444' } : {}]}>
          {t(`⏱ ${toArabicNumerals(timeLeft)} ثانية`, `⏱ ${timeLeft}s`)}
        </Text>
      </View>

      {/* Input area (only visible during user's turn) */}
      {isMyTurn && (
        <View style={styles.inputSection}>
          <Animated.View style={[styles.inputRow, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={styles.chainInput}
              value={input}
              onChangeText={setInput}
              placeholder={isEnglish ? `Word starting with ${requiredLetter}...` : `كلمة تبدأ بـ ${requiredLetter}...`}
              placeholderTextColor="#6B7280"
              textAlign={isEnglish ? 'left' : 'right'}
              autoFocus
              onSubmitEditing={submitWord}
            />
          </Animated.View>
          <TouchableOpacity style={styles.primaryBtn} onPress={submitWord}>
            <Text style={styles.primaryBtnText}>{t('أدخل', 'Submit')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isMyTurn && (
        <View style={styles.waitingSection}>
          <Text style={styles.waitingText}>{t(`🤔 ${players[currentPlayer]} يفكر...`, `🤔 ${players[currentPlayer]} is thinking...`)}</Text>
        </View>
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
  headerEmoji: { fontSize: 22, width: 36, textAlign: 'center' },

  // Lobby
  lobbyContent: { flex: 1, paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  lobbyEmoji: { fontSize: 64, marginBottom: 12 },
  lobbyTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  lobbySub: { fontSize: 15, color: '#A78BFA', marginBottom: 24, textAlign: 'center' },
  rulesCard: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  ruleText: { fontSize: 16, color: '#FFF', fontWeight: '600', textAlign: 'right' },
  playersRow: {
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playerChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playerChipText: { fontSize: 14, fontWeight: '700' },

  // Playing
  playersBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    justifyContent: 'center',
  },
  playerBadge: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
  },
  playerName: { fontSize: 12, fontWeight: '800' },
  playerLives: { fontSize: 10 },

  chainSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chainLabel: { fontSize: 14, fontWeight: '700', color: '#A78BFA', textAlign: 'right', marginBottom: 8 },
  chainScroll: { gap: 4, paddingRight: 2 },
  chainItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chainWord: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    overflow: 'hidden',
  },
  chainArrow: { fontSize: 14, color: '#6B7280' },

  turnSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  turnLabel: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  requiredLetter: { fontSize: 18, fontWeight: '700', color: '#A78BFA' },
  turnTimer: { fontSize: 24, fontWeight: '900', color: '#FFF', fontVariant: ['tabular-nums'] },

  inputSection: {
    paddingHorizontal: 20,
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  inputRow: {},
  chainInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D50',
    height: 54,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  waitingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: { fontSize: 20, color: '#A78BFA', fontWeight: '700' },

  primaryBtn: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
