import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, TouchableOpacity,
  Animated, ActivityIndicator, ScrollView, Dimensions, Alert, AppState,
} from 'react-native';
import { router } from 'expo-router';
import { QuitTracker } from '../src/lib/QuitTracker';
import { WordEngine, type GameState } from '../src/engine/WordEngine';
import { getRandomWordWithCategory, isValidWord } from '../src/lib/words';
import { getRandomEnglishWord, isValidEnglishWord } from '../src/lib/words_en';
import { getCategoryEmoji, getCategoryColor } from '../src/lib/categories';
import { GuessGrid } from '../src/components/GuessGrid';
import { ArabicKeyboard } from '../src/components/ArabicKeyboard';
import { EnglishKeyboard } from '../src/components/EnglishKeyboard';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useUserStore } from '../src/store/userStore';
import { supabase } from '../src/lib/supabase';
import { COLORS, GAME } from '../src/lib/constants';
import { HintBar } from '../src/components/HintBar';
import { useDuel } from '../src/hooks/useDuel';
import { useLanguage } from '../src/lib/LanguageContext';
import { WinAnimationPlayer } from '../src/components/WinAnimations';
import { ProfileBackground } from '../src/components/ProfileBackground';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { AnimatedPlayerName } from '../src/components/AnimatedPlayerName';
import { type UsernameColor } from '../src/components/ColoredUsername';

const { width: SW } = Dimensions.get('window');

type Phase = 'home' | 'searching' | 'countdown' | 'playing' | 'result';
type OpponentType = 'bot' | 'player';

interface DuelConfig {
  wordLength: number;
  attempts: number;
  label: string;
  difficulty: string;
}

interface ChatMsg {
  emoji: string;
  from: 'me' | 'opp';
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  side: 'left' | 'right';
}

const DUEL_CONFIGS: DuelConfig[] = [
  { wordLength: 3, attempts: 6, label: '3 أحرف', difficulty: 'سهل' },
  { wordLength: 4, attempts: 6, label: '4 أحرف', difficulty: 'متوسط' },
  { wordLength: 5, attempts: 6, label: '5 أحرف', difficulty: 'صعب' },
  { wordLength: 6, attempts: 5, label: '6 أحرف', difficulty: 'خبير' },
  { wordLength: 7, attempts: 4, label: '7 أحرف', difficulty: 'أسطوري' },
];

const DUEL_CONFIGS_EN: DuelConfig[] = [
  { wordLength: 3, attempts: 6, label: '3 letters', difficulty: 'Easy' },
  { wordLength: 4, attempts: 6, label: '4 letters', difficulty: 'Medium' },
  { wordLength: 5, attempts: 6, label: '5 letters', difficulty: 'Hard' },
  { wordLength: 6, attempts: 5, label: '6 letters', difficulty: 'Expert' },
  { wordLength: 7, attempts: 4, label: '7 letters', difficulty: 'Legendary' },
];

const REACTION_EMOJIS = ['🔥', '😂', '👏', '😤', '💪', '🎉', '😱', '🤝'];
const AI_EMOJIS = ['😤', '🤖', '👾', '😅'];

function getRandomDuelConfig(): DuelConfig {
  const weights = [10, 30, 40, 15, 5];
  const rand = Math.random() * 100;
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (rand < cum) return DUEL_CONFIGS[i];
  }
  return DUEL_CONFIGS[2];
}

// ── Floating emoji component ──
function EmojiFloat({ emoji, side }: { emoji: string; side: 'left' | 'right' }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1.3, useNativeDriver: true }),
      Animated.timing(ty, { toValue: -130, duration: 1500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(op, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emojiFloat,
        side === 'right' ? { right: 30 } : { left: 30 },
        { opacity: op, transform: [{ translateY: ty }, { scale: sc }] },
      ]}
    >
      <Text style={styles.emojiFloatText}>{emoji}</Text>
    </Animated.View>
  );
}

export default function DuelScreen() {
  const { user } = useUserStore();
  const { language, t, isEnglish } = useLanguage();
  const { activeWinAnimationId, activeProfileBgId } = useCosmeticStore();
  const p = user || { id: 'offline', username: isEnglish ? 'Player' : 'لاعب', avatarColor: COLORS.PURPLE, currentStreak: 0, coins: 0 };

  // Real multiplayer hook
  const duel = useDuel();

  const [phase, setPhase] = useState<Phase>('home');
  const [game, setGame] = useState<GameState | null>(null);
  const [shake, setShake] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [config, setConfig] = useState<DuelConfig>(DUEL_CONFIGS[2]);
  const [opponentType, setOpponentType] = useState<OpponentType>('bot');
  const [category, setCategory] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [showWinAnim, setShowWinAnim] = useState(true);
  const duelOverlayOpacity = useRef(new Animated.Value(0.4)).current;

  // Opponent AI
  const [oppAttempts, setOppAttempts] = useState(0);
  const [oppStatus, setOppStatus] = useState('');
  const [oppFinished, setOppFinished] = useState(false);
  const [oppWon, setOppWon] = useState(false);
  const [iWon, setIWon] = useState(false);
  const [oppTime, setOppTime] = useState(0);
  const [oppProfile, setOppProfile] = useState<{
    username: string;
    username_color: string;
    is_elite: boolean;
    avatar_color: string;
  } | null>(null);
  const startTimeRef = useRef(Date.now());
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameEndedRef = useRef(false);

  // Quit penalty & ban
  const [isBanned, setIsBanned] = useState(false);
  const [banTimeLeft, setBanTimeLeft] = useState('');
  const [consecutiveQuits, setConsecutiveQuits] = useState(0);
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check ban on mount
  useEffect(() => {
    QuitTracker.isBanned().then(s => { setIsBanned(s.banned); setBanTimeLeft(s.remainingText); });
    QuitTracker.getConsecutiveQuits().then(setConsecutiveQuits);
  }, [phase]);

  // Sync real multiplayer state into component phases
  useEffect(() => {
    if (opponentType !== 'player') return;

    // Searching → matched
    if (duel.isSearching && phase !== 'searching') return;
    if (!duel.isSearching && duel.duelState?.status === 'active' && phase === 'searching') {
      // Opponent found — start countdown
      const word = duel.duelState.word;
      const cfg = DUEL_CONFIGS.find(c => c.wordLength === word.length) || DUEL_CONFIGS[2];
      setConfig(cfg);
      setCategory('');
      setGame(null); // will use duel.myGame
      setOppAttempts(0); setOppFinished(false); setOppWon(false);
      setOppStatus(''); setElapsed(0); setIWon(false); setOppTime(0); setDuelHintsUsed(0);
      gameEndedRef.current = false;
      setPhase('countdown');
    }

    // Track opponent progress in real time
    if (duel.duelState && phase === 'playing') {
      setOppAttempts(duel.duelState.opponentAttempts);
      if (duel.duelState.opponentFinished) {
        setOppFinished(true);
        setOppWon(duel.duelState.opponentSuccess === true);
        setOppStatus(duel.duelState.opponentSuccess
          ? (isEnglish ? 'Opponent: got it! ✓' : 'المنافس: أصاب الكلمة! ✓')
          : (isEnglish ? 'Opponent: missed ✗' : 'المنافس: لم يصب ✗'));
      } else if (duel.duelState.opponentAttempts > 0) {
        setOppStatus(isEnglish
          ? `Opponent: attempt ${duel.duelState.opponentAttempts}`
          : `المنافس: محاولة ${toArabicNumerals(duel.duelState.opponentAttempts)}`);
      }
    }

    // Fetch opponent profile when their id becomes known
    if (duel.duelState?.opponentId && !oppProfile) {
      supabase
        .from('profiles')
        .select('username, username_color, is_elite, avatar_color')
        .eq('id', duel.duelState.opponentId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setOppProfile({
              username: data.username || (isEnglish ? 'Player' : 'لاعب'),
              username_color: data.username_color || 'default',
              is_elite: !!data.is_elite,
              avatar_color: data.avatar_color || '#EF4444',
            });
          }
        });
    }

    // Game finished via realtime
    if (duel.duelState?.status === 'finished' && phase === 'playing') {
      gameEndedRef.current = true;
      const playerWon = duel.duelState.winnerId === p.id;
      setIWon(playerWon);
      setTimeout(() => endDuel(playerWon), 1200);
    }
  }, [duel.isSearching, duel.duelState, phase, opponentType]);

  // AppState detection — background = grace period
  useEffect(() => {
    if (phase !== 'playing') return;
    const sub = AppState.addEventListener('change', (next) => {
      if ((next === 'background' || next === 'inactive') && !gameEndedRef.current) {
        graceTimerRef.current = setTimeout(() => handleQuitDuel(), 30000);
      }
      if (next === 'active' && graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    });
    return () => { sub.remove(); if (graceTimerRef.current) clearTimeout(graceTimerRef.current); };
  }, [phase]);

  async function handleQuitDuel() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    gameEndedRef.current = true;
    const { updateCoins } = useUserStore.getState();
    updateCoins(-QuitTracker.PENALTY_COINS);
    const quits = await QuitTracker.recordQuit();
    setConsecutiveQuits(quits >= QuitTracker.MAX_QUITS ? 0 : quits);
    showToast(isEnglish ? `You lost — ${QuitTracker.PENALTY_COINS} coins` : `خسرت المباراة — ${QuitTracker.PENALTY_COINS} عملات`, 'error', 2500);
    setTimeout(() => reset(), 1500);
  }

  function confirmQuit() {
    Alert.alert(
      isEnglish ? 'Leave match?' : 'مغادرة المباراة؟',
      isEnglish
        ? `Leaving counts as a loss and costs ${QuitTracker.PENALTY_COINS} coins`
        : `إذا غادرت ستُحسب خسارة وتخسر ${QuitTracker.PENALTY_COINS} عملات`,
      [
        { text: isEnglish ? 'Keep playing' : 'استمر في اللعب', style: 'cancel' },
        { text: isEnglish ? 'Leave (loss)' : 'غادر (خسارة)', style: 'destructive', onPress: handleQuitDuel },
      ]
    );
  }

  // Hints
  const [duelHintsUsed, setDuelHintsUsed] = useState(0);

  function handleDuelReveal(position: number, letter: string) {
    setDuelHintsUsed(prev => prev + 1);
    showToast(isEnglish ? `💡 Letter ${position + 1}: ${letter}` : `💡 الحرف ${position + 1}: ${letter}`, 'success', 2000);
  }

  // Emoji reactions
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const floatIdRef = useRef(0);

  // Post-game chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  // Coins animation
  const coinScale = useRef(new Animated.Value(0.5)).current;
  const coinOp = useRef(new Animated.Value(0)).current;

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  // Countdown animation
  const countdownScale = useRef(new Animated.Value(1.5)).current;
  const countdownOp = useRef(new Animated.Value(0)).current;

  function showToast(msg: string, type: 'error' | 'success' | 'info', dur = 1800) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, dur);
  }

  function addFloatingEmoji(emoji: string, side: 'left' | 'right') {
    const id = ++floatIdRef.current;
    setFloatingEmojis(prev => [...prev, { id, emoji, side }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2000);
  }

  function sendEmoji(emoji: string) {
    setShowEmojiBar(false);
    addFloatingEmoji(emoji, 'right');
    // In real multiplayer this would go through Supabase realtime
  }

  function sendChatEmoji(emoji: string) {
    setChatMessages(prev => [...prev, { emoji, from: 'me' }]);
  }

  function animateCoins() {
    coinScale.setValue(0.5);
    coinOp.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(coinScale, { toValue: 1.3, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(coinOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.timing(coinScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(1200),
    ]).start();
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // AI opponent — only for bot mode
  useEffect(() => {
    if (phase !== 'playing' || opponentType !== 'bot') return;
    gameEndedRef.current = false;

    function aiTick() {
      const delay = 8000 + Math.random() * 7000;
      aiTimerRef.current = setTimeout(() => {
        if (gameEndedRef.current) return;
        setOppAttempts(prev => {
          const next = prev + 1;
          if (next >= 4 && Math.random() < 0.3) {
            // AI wins — game ends immediately
            const aiTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setOppFinished(true);
            setOppWon(true);
            setOppTime(aiTime);
            setOppStatus(isEnglish ? 'Opponent: got it! ✓' : 'المنافس: أصاب الكلمة! ✓');
            if (!gameEndedRef.current) {
              gameEndedRef.current = true;
              setTimeout(() => endDuel(false, next, aiTime), 1200);
            }
            return next;
          }
          if (next >= config.attempts) {
            setOppFinished(true);
            setOppWon(false);
            setOppStatus(isEnglish ? 'Opponent: missed ✗' : 'المنافس: لم يصب ✗');
            return next;
          }
          setOppStatus(isEnglish ? `Opponent: attempt ${next}` : `المنافس: محاولة ${toArabicNumerals(next)}`);

          aiTick();
          return next;
        });
      }, delay);
    }

    setOppStatus(isEnglish ? 'Opponent: typing...' : 'المنافس: يكتب...');
    const aiStartTimer = setTimeout(() => aiTick(), 3000);
    return () => { clearTimeout(aiStartTimer); if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [phase, config.attempts]);

  // AI sends random emoji during game (bot mode only)
  useEffect(() => {
    if (phase !== 'playing' || opponentType !== 'bot') return;
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
        addFloatingEmoji(emoji, 'left');
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [phase]);

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return;
    let count = 3;
    setCountdown(3);

    function animateNumber() {
      countdownScale.setValue(1.5);
      countdownOp.setValue(1);
      Animated.parallel([
        Animated.timing(countdownScale, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(countdownOp, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(500),
          Animated.timing(countdownOp, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]),
      ]).start();
    }

    animateNumber();
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        startTimeRef.current = Date.now();
        setPhase('playing');
      } else {
        setCountdown(count);
        animateNumber();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  function endDuel(playerWon: boolean, aiAttempts?: number, aiTime?: number) {
    setShowWinAnim(true);
    duelOverlayOpacity.setValue(0.4);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    QuitTracker.recordComplete();
    setConsecutiveQuits(0);
    const aiEmoji = AI_EMOJIS[Math.floor(Math.random() * AI_EMOJIS.length)];
    setChatMessages([{ emoji: aiEmoji, from: 'opp' }]);
    // Award coins — for bot mode only (real player coins are awarded via useDuel realtime)
    if (opponentType === 'bot') {
      const { updateCoins } = useUserStore.getState();
      const amount = playerWon ? GAME.DUEL_BOT_WIN_COINS : GAME.DUEL_BOT_PARTICIPATE_COINS;
      updateCoins(amount);
      supabase.rpc('add_coins', { amount, reason: 'duel_win' }).then(() => {});
    }
    animateCoins();
    setPhase('result');
  }

  async function startGame(type?: OpponentType) {
    const chosenType = type ?? opponentType;
    setOpponentType(chosenType);
    const banStatus = await QuitTracker.isBanned();
    if (banStatus.banned) {
      setIsBanned(true);
      setBanTimeLeft(banStatus.remainingText);
      return;
    }
    setChatMessages([]);
    setFloatingEmojis([]);
    setOppProfile(null);

    if (chosenType === 'bot') {
      // Skip searching, go straight to countdown
      const cfg = { ...getRandomDuelConfig() };
      setConfig(cfg);
      let word: string;
      let cat: string;
      if (isEnglish) {
        // English only has 5-letter words; override config for bot mode
        const entry = getRandomEnglishWord();
        word = entry.word;
        cat = entry.category;
        cfg.wordLength = 5;
        cfg.label = '5 letters';
        cfg.difficulty = 'Hard';
      } else {
        const entry = getRandomWordWithCategory(cfg.wordLength);
        word = entry.word;
        cat = entry.category;
      }
      setCategory(cat);
      setGame(WordEngine.createGame(word, cfg.attempts));
      setOppAttempts(0); setOppFinished(false); setOppWon(false);
      setOppStatus(''); setElapsed(0); setIWon(false); setOppTime(0); setDuelHintsUsed(0);
      gameEndedRef.current = false;
      setPhase('countdown');
      return;
    }

    // Real matchmaking via Supabase
    setPhase('searching');
    duel.startMatchmaking();
    // The useEffect sync above will handle transitioning phases
  }

  // Use the real duel game state when playing against a real player
  const activeGame = opponentType === 'player' && duel.duelState ? duel.myGame : game;

  const addLetter = useCallback((letter: string) => {
    if (opponentType === 'player') {
      duel.addLetter(letter);
    } else {
      if (!game || game.gameStatus !== 'playing') return;
      if (game.currentGuess.length >= game.targetWord.length) return;
      setGame({ ...game, currentGuess: game.currentGuess + letter });
    }
  }, [game, opponentType, duel]);

  const deleteLetter = useCallback(() => {
    if (opponentType === 'player') {
      duel.deleteLetter();
    } else {
      if (!game || game.gameStatus !== 'playing') return;
      if (game.currentGuess.length === 0) return;
      setGame({ ...game, currentGuess: game.currentGuess.slice(0, -1) });
    }
  }, [game, opponentType, duel]);

  function handleSubmit() {
    if (opponentType === 'player') {
      duel.submitGuess();
      // Check if game ended after submit
      if (duel.myGame.gameStatus === 'won') {
        setIWon(true);
        gameEndedRef.current = true;
      } else if (duel.myGame.gameStatus === 'lost') {
        gameEndedRef.current = true;
      }
      return;
    }
    if (!game || game.gameStatus !== 'playing' || gameEndedRef.current) return;
    if (game.currentGuess.length !== game.targetWord.length) {
      triggerShake(); showToast(isEnglish ? 'Complete the word' : 'أكمل الكلمة', 'info'); return;
    }
    const wordValid = language === 'en'
      ? isValidEnglishWord(game.currentGuess)
      : isValidWord(game.currentGuess);
    if (!wordValid) {
      triggerShake(); showToast(isEnglish ? 'Not in word list ❌' : 'كلمة غير موجودة ❌', 'error'); return;
    }
    const newState = WordEngine.submitGuess(game);
    setGame(newState);
    if (newState.gameStatus === 'won') {
      setIWon(true);
      gameEndedRef.current = true;
      setTimeout(() => endDuel(true), 1200);
    } else if (newState.gameStatus === 'lost') {
      gameEndedRef.current = true;
      setTimeout(() => endDuel(false), 1200);
    }
  }

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 300); }
  function reset() {
    if (opponentType === 'player') duel.cleanup();
    setPhase('home'); setGame(null); setShowEmojiBar(false);
  }

  const timerStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
  const myTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const didWin = iWon && (!oppWon || (activeGame?.attempts || 99) <= oppAttempts);
  const catColor = getCategoryColor(category);
  const catEmoji = getCategoryEmoji(category);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── BANNED ──
  if (isBanned) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 72 }}>🚫</Text>
          <Text style={[styles.homeTitle, { color: '#EF4444' }]}>{isEnglish ? 'Temporarily banned' : 'تم إيقافك مؤقتاً'}</Text>
          <Text style={styles.homeSub}>
            {isEnglish
              ? `You quit ${QuitTracker.MAX_QUITS} matches in a row\nYou can return after:`
              : `غادرت ${toArabicNumerals(QuitTracker.MAX_QUITS)} مباريات متتالية\nيمكنك العودة بعد:`}
          </Text>
          <View style={styles.banTimer}>
            <Text style={styles.banTimerText}>{banTimeLeft}</Text>
          </View>
          <View style={styles.banWarning}>
            <Text style={styles.banWarningText}>
              {isEnglish
                ? '⚠️ Quitting matches hurts other players\nEvery completed match resets the counter'
                : '⚠️ مغادرة المباريات تضر بتجربة اللاعبين\nكل مباراة تكملها تصفّر العداد'}
            </Text>
          </View>
          <Pressable style={[styles.playBtn, { backgroundColor: '#374151' }]} onPress={async () => {
            const s = await QuitTracker.isBanned();
            if (!s.banned) { setIsBanned(false); }
            else setBanTimeLeft(s.remainingText);
          }}>
            <Text style={styles.playBtnText}>{isEnglish ? 'Check again' : 'تحقق مجدداً'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── HOME ──
  if (phase === 'home') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <View style={styles.centerContent}>
          <Text style={styles.homeIcon}>⚡</Text>
          <Text style={styles.homeTitle}>{isEnglish ? 'Speed Duel' : 'تحدٍ سريع'}</Text>
          <Text style={styles.homeSub}>{isEnglish ? 'Random word — fastest solve wins!' : 'كلمة عشوائية — أسرع حلّ يفوز!'}</Text>
          <View style={styles.lengthPreview}>
            {DUEL_CONFIGS.map((c, i) => (
              <View key={i} style={styles.lengthDot}>
                <Text style={styles.lengthDotText}>{c.wordLength}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.lengthHint}>{isEnglish ? 'Letter count changes each match' : 'عدد الأحرف يتغيّر كل مباراة'}</Text>

          {consecutiveQuits >= 3 && (
            <View style={styles.quitWarning}>
              <Text style={styles.quitWarningText}>
                {isEnglish
                  ? `⚠️ Warning: ${consecutiveQuits}/${QuitTracker.MAX_QUITS} quits — next one bans you 5 min`
                  : `⚠️ تحذير: ${toArabicNumerals(consecutiveQuits)}/${toArabicNumerals(QuitTracker.MAX_QUITS)} مغادرات — التالية تُوقفك 5 دقائق`}
              </Text>
            </View>
          )}

          <Pressable style={styles.playBtn} onPress={() => startGame('player')}>
            <Text style={styles.playBtnText}>{isEnglish ? 'Play vs real player 👤' : 'العب ضد لاعب حقيقي 👤'}</Text>
          </Pressable>
          <Text style={styles.coinNote}>{isEnglish ? `🪙 Win: +${GAME.DUEL_WIN_COINS} | Play: +${GAME.DUEL_PARTICIPATE_COINS}` : `🪙 الفوز: +${GAME.DUEL_WIN_COINS} | المشاركة: +${GAME.DUEL_PARTICIPATE_COINS}`}</Text>

          <Pressable style={[styles.playBtn, styles.botBtn]} onPress={() => startGame('bot')}>
            <Text style={styles.playBtnText}>{isEnglish ? 'Play vs Bot 🤖' : 'العب ضد البوت 🤖'}</Text>
          </Pressable>
          <Text style={styles.coinNote}>{isEnglish ? `🪙 Win: +${GAME.DUEL_BOT_WIN_COINS} | Play: +${GAME.DUEL_BOT_PARTICIPATE_COINS}` : `🪙 الفوز: +${GAME.DUEL_BOT_WIN_COINS} | المشاركة: +${GAME.DUEL_BOT_PARTICIPATE_COINS}`}</Text>
        </View>
      </View>
    );
  }

  // ── SEARCHING ──
  if (phase === 'searching') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.PURPLE} />
          <Text style={styles.searchText}>{isEnglish ? 'Searching for opponent...' : 'جاري البحث عن منافس...'}</Text>
          <Pressable style={styles.cancelBtn} onPress={reset}><Text style={styles.cancelText}>{isEnglish ? 'Cancel' : 'إلغاء'}</Text></Pressable>
        </View>
      </View>
    );
  }

  // ── COUNTDOWN ──
  if (phase === 'countdown') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.readyText}>{isEnglish ? 'Ready?' : 'جاهز؟'}</Text>
          <View style={[styles.categoryPill, { backgroundColor: catColor + '20', borderColor: catColor }]}>
            <Text style={styles.catPillEmoji}>{catEmoji}</Text>
            <Text style={[styles.catPillText, { color: catColor }]}>{category}</Text>
            <Text style={styles.catPillSep}>•</Text>
            <Text style={[styles.catPillText, { color: catColor }]}>
              {isEnglish
                ? `${(DUEL_CONFIGS_EN.find(c => c.wordLength === config.wordLength) || config).label} — ${(DUEL_CONFIGS_EN.find(c => c.wordLength === config.wordLength) || config).difficulty}`
                : `${config.label} — ${config.difficulty}`}
            </Text>
          </View>
          <Animated.View style={{ opacity: countdownOp, transform: [{ scale: countdownScale }] }}>
            <Text style={styles.countdownNum}>{countdown}</Text>
          </Animated.View>
          <Text style={styles.vsPreview}>{isEnglish ? 'You' : 'أنت'}  ⚔️  {opponentType === 'bot' ? (isEnglish ? 'Bot 🤖' : 'بوت 🤖') : (isEnglish ? 'Player 👤' : 'لاعب 👤')}</Text>
        </View>
      </View>
    );
  }

  // ── RESULT ──
  if (phase === 'result') {
    const targetLetters = activeGame ? [...activeGame.targetWord] : [];
    return (
      <View style={styles.container}>
        {/* Profile background */}
        {didWin && activeProfileBgId && activeProfileBgId !== 'none' && (
          <ProfileBackground theme={activeProfileBgId} />
        )}
        {/* Dark overlay — fades after animation */}
        {didWin && <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: duelOverlayOpacity, zIndex: 1 }} />}
        {/* Win animation */}
        {didWin && showWinAnim && (
          <WinAnimationPlayer
            animationId={activeWinAnimationId || 'default'}
            onDone={() => {
              setShowWinAnim(false);
              Animated.timing(duelOverlayOpacity, {
                toValue: 0.1, duration: 600, useNativeDriver: true,
              }).start();
            }}
          />
        )}
        <ScrollView contentContainerStyle={[styles.resultScroll, { zIndex: 10 }]}>
          {/* Winner */}
          <Text style={styles.resultEmoji}>{didWin ? '🏆' : '💪'}</Text>
          <Text style={[styles.resultTitle, didWin && { color: COLORS.GOLD }]}>
            {didWin ? (isEnglish ? 'You Won!' : 'فزت!') : (isEnglish ? 'You Lost!' : 'خسرت!')}
          </Text>

          {/* Revealed word */}
          <Text style={styles.revealLabel}>{isEnglish ? 'The correct word was:' : 'الكلمة الصحيحة كانت:'}</Text>
          <View style={styles.revealRow}>
            {targetLetters.map((l, i) => (
              <View key={i} style={styles.revealCell}>
                <Text style={styles.revealLetter}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Category */}
          <View style={[styles.categoryPillSmall, { backgroundColor: catColor + '18', borderColor: catColor + '40', alignSelf: 'center' }]}>
            <Text style={styles.catSmallEmoji}>{catEmoji}</Text>
            <Text style={[styles.catSmallText, { color: catColor }]}>{category} • {config.label}</Text>
          </View>

          {/* Comparison cards */}
          <View style={styles.compareRow}>
            <View style={[styles.compareCard, didWin && styles.compareWin]}>
              <View style={[styles.compareAvatar, { backgroundColor: p.avatarColor }]}>
                <Text style={styles.compareAvatarText}>{p.username.charAt(0)}</Text>
              </View>
              <AnimatedPlayerName
                name={p.username || (isEnglish ? 'You' : 'أنت')}
                colorEffect={((user?.usernameColor) as UsernameColor) || 'default'}
                fontSize={14}
                fontWeight="800"
              />
              <Text style={styles.compareAttempts}>
                {iWon
                  ? (isEnglish ? `${activeGame?.attempts || 0} attempts` : `${toArabicNumerals(activeGame?.attempts || 0)} محاولة`)
                  : (isEnglish ? 'Missed' : 'لم يصب')}
              </Text>
              <Text style={styles.compareTime}>{fmtTime(elapsed)}</Text>
            </View>
            <Text style={styles.compareVs}>VS</Text>
            <View style={[styles.compareCard, !didWin && oppWon && styles.compareWin]}>
              <View style={[styles.compareAvatar, { backgroundColor: oppProfile?.avatar_color || '#EF4444' }]}>
                <Text style={styles.compareAvatarText}>
                  {opponentType === 'bot'
                    ? (isEnglish ? 'B' : 'ب')
                    : (oppProfile?.username?.charAt(0) || (isEnglish ? 'P' : 'ل'))}
                </Text>
              </View>
              {opponentType === 'bot' ? (
                <Text style={styles.compareName}>{isEnglish ? 'Bot' : 'بوت'}</Text>
              ) : (
                <AnimatedPlayerName
                  name={oppProfile?.username || (isEnglish ? 'Player' : 'لاعب')}
                  colorEffect={(oppProfile?.username_color as UsernameColor) || 'default'}
                  fontSize={14}
                  fontWeight="800"
                />
              )}
              <Text style={styles.compareAttempts}>
                {oppWon
                  ? (isEnglish ? `${oppAttempts} attempts` : `${toArabicNumerals(oppAttempts)} محاولة`)
                  : (isEnglish ? 'Missed' : 'لم يصب')}
              </Text>
              <Text style={styles.compareTime}>{fmtTime(oppTime || elapsed)}</Text>
            </View>
          </View>

          {/* Coins */}
          <Animated.View style={{ opacity: coinOp, transform: [{ scale: coinScale }] }}>
            <Text style={styles.coinEarned}>{didWin
              ? `🪙 +${opponentType === 'bot' ? GAME.DUEL_BOT_WIN_COINS : GAME.DUEL_WIN_COINS} ${isEnglish ? 'coins' : 'عملات'}`
              : `🪙 +${opponentType === 'bot' ? GAME.DUEL_BOT_PARTICIPATE_COINS : GAME.DUEL_PARTICIPATE_COINS} ${isEnglish ? 'coins' : 'عملات'}`
            }</Text>
          </Animated.View>

          {/* Post-game chat */}
          <View style={styles.chatSection}>
            <Text style={[styles.chatTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{isEnglish ? '💬 Chat' : '💬 الدردشة'}</Text>
            <View style={styles.chatMessages}>
              {chatMessages.map((msg, i) => (
                <View key={i} style={[styles.chatBubbleRow, msg.from === 'me' && styles.chatBubbleRowMe]}>
                  <View style={[styles.chatAvatar, { backgroundColor: msg.from === 'me' ? p.avatarColor : '#EF4444' }]}>
                    <Text style={styles.chatAvatarText}>{msg.from === 'me' ? (isEnglish ? 'Me' : 'أنا') : (isEnglish ? 'O' : 'ك')}</Text>
                  </View>
                  <View style={[styles.chatBubble, msg.from === 'me' ? styles.chatBubbleMe : styles.chatBubbleOpp]}>
                    <Text style={styles.chatBubbleEmoji}>{msg.emoji}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.chatBar}>
              {REACTION_EMOJIS.map((e) => (
                <Pressable key={e} style={styles.chatEmojiBtn} onPress={() => sendChatEmoji(e)}>
                  <Text style={styles.chatEmojiBtnText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <Pressable style={styles.playBtn} onPress={() => startGame()}>
            <Text style={styles.playBtnText}>{isEnglish ? 'Another match ⚡' : 'مباراة أخرى ⚡'}</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={styles.cancelText}>{isEnglish ? 'Back' : 'العودة'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── PLAYING ──
  const playGame = activeGame;
  if (!playGame) return <View style={styles.container} />;
  const keyboardStates = isEnglish
    ? WordEngine.getKeyboardStatesEN(playGame.guesses, playGame.results)
    : WordEngine.getKeyboardStates(playGame.guesses, playGame.results);
  const canSubmit = playGame.currentGuess.length === playGame.targetWord.length;

  const myDots = Array.from({ length: config.attempts }, (_, i) => {
    if (i < playGame.guesses.length) return playGame.results[i]?.every(r => r === 'correct') ? 'won' : 'used';
    return 'empty';
  });
  const opDots = Array.from({ length: config.attempts }, (_, i) => {
    if (i < oppAttempts) return oppWon && i === oppAttempts - 1 ? 'won' : 'used';
    return 'empty';
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtnSmall} onPress={confirmQuit}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEnglish ? 'Speed Duel' : 'تحدٍ سريع'}</Text>
        <Text style={styles.timerText}>{timerStr}</Text>
      </View>

      {/* VS Panel */}
      <View style={styles.vsPanel}>
        <View style={styles.playerCol}>
          <View style={[styles.miniAvatar, { backgroundColor: p.avatarColor }]}>
            <Text style={styles.miniAvatarText}>{p.username.charAt(0)}</Text>
          </View>
          <AnimatedPlayerName
            name={p.username || (isEnglish ? 'You' : 'أنت')}
            colorEffect={((user?.usernameColor) as UsernameColor) || 'default'}
            fontSize={13}
            fontWeight="700"
          />
          <View style={styles.dotsRow}>
            {myDots.map((d, i) => <View key={i} style={[styles.dot, d === 'won' && styles.dotGreen, d === 'used' && styles.dotGray]} />)}
          </View>
        </View>
        <Text style={styles.vsText}>⚔️</Text>
        <View style={styles.playerCol}>
          <View style={[styles.miniAvatar, { backgroundColor: oppProfile?.avatar_color || '#EF4444' }]}>
            <Text style={styles.miniAvatarText}>
              {opponentType === 'bot'
                ? (isEnglish ? 'B' : 'ب')
                : (oppProfile?.username?.charAt(0) || (isEnglish ? 'P' : 'ل'))}
            </Text>
          </View>
          {opponentType === 'bot' ? (
            <Text style={styles.playerName}>{isEnglish ? 'Bot' : 'بوت'}</Text>
          ) : (
            <AnimatedPlayerName
              name={oppProfile?.username || (isEnglish ? 'Player' : 'لاعب')}
              colorEffect={(oppProfile?.username_color as UsernameColor) || 'default'}
              fontSize={13}
              fontWeight="700"
            />
          )}
          <View style={styles.dotsRow}>
            {opDots.map((d, i) => <View key={i} style={[styles.dot, d === 'won' && styles.dotGreen, d === 'used' && styles.dotGray]} />)}
          </View>
        </View>
      </View>

      {/* Category */}
      <View style={styles.catRow}>
        <View style={[styles.categoryPillSmall, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
          <Text style={styles.catSmallEmoji}>{catEmoji}</Text>
          <Text style={[styles.catSmallText, { color: catColor }]}>{category} • {config.label}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridArea}>
        <GuessGrid
          wordLength={playGame.targetWord.length}
          guesses={playGame.guesses}
          results={playGame.results}
          currentGuess={playGame.currentGuess}
          shake={shake || duel.shake}
          maxAttempts={config.attempts}
          gameWon={playGame.gameStatus === 'won'}
        />
      </View>

      {/* Opponent status */}
      <View style={styles.oppBar}>
        <Text style={[styles.oppText, oppFinished && (oppWon ? styles.greenT : styles.redT)]}>
          {oppStatus || (isEnglish ? 'Opponent: preparing...' : 'المنافس: يستعد...')}
        </Text>
      </View>

      {/* Quit warning */}
      {consecutiveQuits >= 3 && (
        <View style={styles.quitWarningInline}>
          <Text style={styles.quitWarningInlineText}>
            {isEnglish
              ? `⚠️ ${consecutiveQuits}/${QuitTracker.MAX_QUITS} quits`
              : `⚠️ ${toArabicNumerals(consecutiveQuits)}/${toArabicNumerals(QuitTracker.MAX_QUITS)} مغادرات`}
          </Text>
        </View>
      )}

      {/* Hints (1 max in duel) */}
      <HintBar
        game={playGame}
        onRevealLetter={handleDuelReveal}
        hintsUsed={duelHintsUsed}
        maxHints={1}
        disabled={playGame.gameStatus !== 'playing'}
      />

      {/* Keyboard */}
      {isEnglish ? (
        <EnglishKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={handleSubmit}
          letterStates={keyboardStates}
          disabled={playGame.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      ) : (
        <ArabicKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={handleSubmit}
          letterStates={keyboardStates}
          disabled={playGame.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      )}

      {/* Emoji reaction button */}
      <TouchableOpacity
        style={styles.emojiBtn}
        onPress={() => setShowEmojiBar(!showEmojiBar)}
        activeOpacity={0.7}
      >
        <Text style={styles.emojiBtnText}>😊</Text>
      </TouchableOpacity>

      {/* Emoji bar */}
      {showEmojiBar && (
        <View style={styles.emojiBarPanel}>
          {REACTION_EMOJIS.map(e => (
            <Pressable key={e} style={styles.emojiBarItem} onPress={() => sendEmoji(e)}>
              <Text style={styles.emojiBarItemText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Floating emojis */}
      {floatingEmojis.map(fe => (
        <EmojiFloat key={fe.id} emoji={fe.emoji} side={fe.side} />
      ))}

      {/* Toast */}
      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity },
          toast.type === 'error' && { backgroundColor: '#EF4444' },
          toast.type === 'success' && { backgroundColor: '#22C55E' },
          toast.type === 'info' && { backgroundColor: '#7C3AED' },
        ]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },

  // Back
  backBtnAbs: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backBtnSmall: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },

  // Home
  homeIcon: { fontSize: 64 },
  homeTitle: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  homeSub: { fontSize: 16, color: COLORS.TEXT_SECONDARY, textAlign: 'center' },
  lengthPreview: { flexDirection: 'row', gap: 8, marginTop: 8 },
  lengthDot: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1E1E3A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2D2D50',
  },
  lengthDotText: { color: COLORS.PURPLE_LIGHT, fontSize: 16, fontWeight: '800' },
  lengthHint: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  playBtn: {
    backgroundColor: COLORS.PURPLE, height: 56, borderRadius: 16,
    width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  playBtnText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  botBtn: { backgroundColor: '#374151', marginTop: 8 },
  coinNote: { fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 2 },
  searchText: { fontSize: 18, color: COLORS.TEXT_SECONDARY, marginTop: 16 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: COLORS.TEXT_SECONDARY, fontSize: 16 },

  // Countdown
  readyText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  countdownNum: { fontSize: 96, fontWeight: '900', color: COLORS.PURPLE },
  vsPreview: { fontSize: 18, color: COLORS.TEXT_SECONDARY, fontWeight: '600' },

  // Category pill
  categoryPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
  catPillEmoji: { fontSize: 18 },
  catPillText: { fontSize: 15, fontWeight: '700' },
  catPillSep: { fontSize: 14, color: '#666' },
  categoryPillSmall: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  catSmallEmoji: { fontSize: 14 },
  catSmallText: { fontSize: 12, fontWeight: '700' },
  catRow: { alignItems: 'center', marginTop: 6, marginBottom: 4 },

  // ── RESULT ──
  resultScroll: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24, gap: 12 },
  resultEmoji: { fontSize: 80 },
  resultTitle: { fontSize: 42, fontWeight: '900', color: '#FFF' },
  revealLabel: { fontSize: 16, color: COLORS.TEXT_SECONDARY, marginTop: 4 },
  revealRow: { flexDirection: 'row-reverse', gap: 6 },
  revealCell: {
    width: 48, height: 52, borderRadius: 10,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center',
  },
  revealLetter: { fontSize: 24, fontWeight: '900', color: '#FFF' },

  // Comparison
  compareRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, width: '100%', marginTop: 8 },
  compareCard: {
    flex: 1, backgroundColor: '#1E1E3A', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#2A2A50',
  },
  compareWin: { borderColor: COLORS.GOLD },
  compareAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  compareAvatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  compareName: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  compareAttempts: { fontSize: 16, fontWeight: '800', color: COLORS.PURPLE_LIGHT },
  compareTime: { fontSize: 13, color: COLORS.TEXT_SECONDARY, fontVariant: ['tabular-nums'] },
  compareVs: { fontSize: 14, fontWeight: '900', color: COLORS.PURPLE },

  coinEarned: { fontSize: 24, fontWeight: '900', color: COLORS.GOLD },

  // Post-game chat
  chatSection: {
    width: '100%', backgroundColor: '#1E1E3A', borderRadius: 16,
    padding: 14, gap: 10, marginTop: 8,
  },
  chatTitle: { fontSize: 15, fontWeight: '700', color: COLORS.TEXT_SECONDARY, textAlign: 'right' },
  chatMessages: { gap: 8, minHeight: 50 },
  chatBubbleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  chatBubbleRowMe: { flexDirection: 'row' },
  chatAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  chatBubble: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  chatBubbleMe: { backgroundColor: COLORS.PURPLE + '30' },
  chatBubbleOpp: { backgroundColor: '#2A2A50' },
  chatBubbleEmoji: { fontSize: 24 },
  chatBar: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  chatEmojiBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#2A2A4A', alignItems: 'center', justifyContent: 'center',
  },
  chatEmojiBtnText: { fontSize: 18 },

  // Header
  header: {
    height: 56, flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E1E3A',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  timerText: { fontSize: 16, fontWeight: '800', color: COLORS.GOLD, fontVariant: ['tabular-nums'] },

  // VS Panel
  vsPanel: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around',
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    marginHorizontal: 16, backgroundColor: '#1E1E3A22', borderRadius: 16,
  },
  playerCol: { alignItems: 'center', gap: 4 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  playerName: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D2D50' },
  dotGreen: { backgroundColor: '#22C55E' },
  dotGray: { backgroundColor: '#6B7280' },
  vsText: { fontSize: 20 },

  // Grid
  gridArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Opponent status
  oppBar: { height: 28, alignItems: 'center', justifyContent: 'center' },
  oppText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  greenT: { color: '#22C55E' },
  redT: { color: '#EF4444' },

  // Emoji reaction button (during game)
  emojiBtn: {
    position: 'absolute', right: 12, top: 200,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2D2D50',
    alignItems: 'center', justifyContent: 'center', zIndex: 50,
  },
  emojiBtnText: { fontSize: 22 },
  emojiBarPanel: {
    position: 'absolute', right: 12, top: 250,
    backgroundColor: '#1E1E3A', borderRadius: 16, padding: 8, gap: 6,
    borderWidth: 1, borderColor: '#2D2D50', zIndex: 50,
  },
  emojiBarItem: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#2A2A4A', alignItems: 'center', justifyContent: 'center',
  },
  emojiBarItemText: { fontSize: 22 },

  // Floating emoji
  emojiFloat: {
    position: 'absolute', bottom: '45%', zIndex: 60,
  },
  emojiFloatText: { fontSize: 48 },

  // Ban
  banTimer: {
    backgroundColor: '#EF444420', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 16,
    borderWidth: 2, borderColor: '#EF4444',
  },
  banTimerText: { fontSize: 48, fontWeight: '900', color: '#EF4444', fontVariant: ['tabular-nums'] },
  banWarning: {
    backgroundColor: '#F59E0B15', borderRadius: 12, padding: 14, width: '100%',
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  banWarningText: { fontSize: 13, color: '#F59E0B', textAlign: 'center', lineHeight: 20 },
  quitWarning: {
    backgroundColor: '#EF444415', borderRadius: 12, padding: 12, width: '100%',
    borderWidth: 1, borderColor: '#EF444430',
  },
  quitWarningText: { fontSize: 13, color: '#EF4444', textAlign: 'center', fontWeight: '600' },
  quitWarningInline: {
    backgroundColor: '#EF444415', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'center',
  },
  quitWarningInlineText: { fontSize: 11, color: '#EF4444', fontWeight: '700' },

  // Toast
  toast: {
    position: 'absolute', top: 70, left: 24, right: 24,
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14,
    alignItems: 'center', zIndex: 100,
  },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
