import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Animated, ScrollView, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../src/lib/LanguageContext';
import { COLORS } from '../src/lib/constants';
import { supabase } from '../src/lib/supabase';
import { ChallengeSystem } from '../src/lib/ChallengeSystem';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { validateWordAsync, calculateClassicWordScore } from '../src/lib/ClassicWordValidator';
import { ClassicHeader } from '../src/components/ClassicHeader';
import { ScorePopup } from '../src/components/ScorePopup';
import { ClassicLeaderboard } from '../src/components/ClassicLeaderboard';

let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch {}

const { width: SW } = Dimensions.get('window');

// ── Types ──

interface WordCard {
  id: string;
  word: string;
  status: 'empty' | 'typing' | 'correct' | 'wrong';
  points: number;
}

// ── Constants ──

const ARABIC_LETTERS = [
  'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'ز', 'س',
  'ش', 'ص', 'ط', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م',
  'ن', 'ه', 'و', 'ي',
];

const ENGLISH_LETTERS = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
];

function getRandomLetter(excludeLast?: string, isEnglish: boolean = false): string {
  const pool = (isEnglish ? ENGLISH_LETTERS : ARABIC_LETTERS).filter(l => l !== excludeLast);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEmptyCards(): WordCard[] {
  return [
    { id: '1', word: '', status: 'empty', points: 0 },
    { id: '2', word: '', status: 'empty', points: 0 },
    { id: '3', word: '', status: 'empty', points: 0 },
  ];
}

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  ar: {
    wrong_letter: 'الكلمة لا تبدأ بالحرف المطلوب',
    not_a_word: 'هذه ليست كلمة عربية',
    too_short: 'الكلمة قصيرة جداً',
    already_used: 'استخدمت هذه الكلمة من قبل',
  },
  en: {
    wrong_letter: 'Word does not start with the required letter',
    not_a_word: 'Not a valid English word',
    too_short: 'Word is too short',
    already_used: 'You already used this word',
  },
};

// ══════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════

export default function ClassicScreen() {
  const { language, t, isEnglish } = useLanguage();
  const isArabic = language === 'ar';
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  const [challengeResult, setChallengeResult] = useState<{ won: boolean | null; myScore: number; oppScore: number | null; wager: number; currency: 'coins' | 'gems' } | null>(null);

  // ── Game phase: ready → countdown → playing ──
  const [gamePhase, setGamePhase] = useState<'ready' | 'countdown' | 'playing'>('ready');
  const [countdown, setCountdown] = useState(3);
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // ── Game state ──
  const [currentLetter, setCurrentLetter] = useState('');
  const [letterIndex, setLetterIndex] = useState(0);
  const [cards, setCards] = useState<WordCard[]>(createEmptyCards);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [sessionScore, setSessionScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [isHotStreak, setIsHotStreak] = useState(false);
  const [hotCount, setHotCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverWord, setGameOverWord] = useState('');
  const [gameOverReason, setGameOverReason] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastPoints, setLastPoints] = useState(0);
  const [showPointsPopup, setShowPointsPopup] = useState(false);

  // ── Double coins booster ──
  const [boosterActive, setBoosterActive] = useState(false);
  const [boosterEndsAt, setBoosterEndsAt] = useState<number | null>(null);
  const [boosterTimeLeft, setBoosterTimeLeft] = useState('');

  // Track completed letter groups for scrollable history
  const [completedGroups, setCompletedGroups] = useState<
    { letter: string; cards: WordCard[] }[]
  >([]);

  // ── Timer state ──
  const INITIAL_TIME = 30;
  const MAX_TIME = 30;
  const TIME_PER_WORD = 5;
  const TIME_PER_LETTER_BONUS = 3;
  const PENALTY_NOT_A_WORD = 3;
  const PENALTY_WRONG_LETTER = 5;
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimeBonus, setShowTimeBonus] = useState(false);
  const [lastTimeBonus, setLastTimeBonus] = useState(0);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const timeBonusAnim = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const letterAnim = useRef(new Animated.Value(1)).current;

  // ── Initialize letter based on language ──
  useEffect(() => {
    if (!currentLetter) {
      setCurrentLetter(getRandomLetter(undefined, isEnglish));
    }
  }, [isEnglish]);

  // ── Timer countdown ──
  useEffect(() => {
    if (!timerActive || isGameOver) return;
    if (timeLeft <= 0) {
      handleGameOver('', 'time_up');
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, isGameOver, timeLeft <= 0]);

  // Animate timer bar
  useEffect(() => {
    Animated.timing(timerBarAnim, {
      toValue: Math.max(0, timeLeft / INITIAL_TIME),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [timeLeft]);

  function addTime(seconds: number) {
    setTimeLeft(prev => Math.min(MAX_TIME, prev + seconds));
    setLastTimeBonus(seconds);
    setShowTimeBonus(true);
    // Animate the +time badge
    timeBonusAnim.setValue(1);
    Animated.timing(timeBonusAnim, {
      toValue: 0, duration: 1200, useNativeDriver: true,
    }).start(() => setShowTimeBonus(false));
  }

  function subtractTime(seconds: number) {
    setTimeLeft(prev => Math.max(0, prev - seconds));
    setLastTimeBonus(-seconds);
    setShowTimeBonus(true);
    timeBonusAnim.setValue(1);
    Animated.timing(timeBonusAnim, {
      toValue: 0, duration: 1200, useNativeDriver: true,
    }).start(() => setShowTimeBonus(false));
  }

  // ── Start button → countdown → playing ──
  function handleStartGame() {
    setGamePhase('countdown');
    setCountdown(3);
  }

  // In challenge mode both players already finished the lobby countdown —
  // skip the manual "Start" tap so they begin playing simultaneously.
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (challengeId && !didAutoStartRef.current && gamePhase === 'ready') {
      didAutoStartRef.current = true;
      handleStartGame();
    }
  }, [challengeId, gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'countdown') return;
    if (countdown <= 0) {
      setGamePhase('playing');
      setTimerActive(true);
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }
    // Animate each number
    countdownAnim.setValue(0);
    Animated.sequence([
      Animated.spring(countdownAnim, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
      Animated.delay(500),
    ]).start();

    const t = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [gamePhase, countdown]);

  // ── Load high score ──
  useEffect(() => {
    AsyncStorage.getItem('kalimat_classic_highscore').then(v => {
      if (v) setHighScore(parseInt(v));
    });
    // Also sync from Supabase
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('classic_high_score')
          .eq('id', user.id)
          .single();
        if (data?.classic_high_score) {
          const local = parseInt((await AsyncStorage.getItem('kalimat_classic_highscore')) || '0');
          if (data.classic_high_score > local) {
            setHighScore(data.classic_high_score);
            await AsyncStorage.setItem('kalimat_classic_highscore', String(data.classic_high_score));
          }
        }
      }
    })();
  }, []);

  // ── Check booster on mount ──
  useEffect(() => {
    (async () => {
      const endsAt = await AsyncStorage.getItem('kalimat_booster_ends_at');
      if (endsAt) {
        const endsAtMs = parseInt(endsAt);
        if (endsAtMs > Date.now()) {
          setBoosterActive(true);
          setBoosterEndsAt(endsAtMs);
        } else {
          await AsyncStorage.removeItem('kalimat_booster_ends_at');
        }
      }
    })();
  }, []);

  // ── Booster countdown ──
  useEffect(() => {
    if (!boosterActive || !boosterEndsAt) return;
    const interval = setInterval(() => {
      const remaining = boosterEndsAt - Date.now();
      if (remaining <= 0) {
        setBoosterActive(false);
        setBoosterEndsAt(null);
        setBoosterTimeLeft('');
        AsyncStorage.removeItem('kalimat_booster_ends_at');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setBoosterTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [boosterActive, boosterEndsAt]);

  async function activateBooster() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('gems').eq('id', user.id).single();
    if (!profile || profile.gems < 30) return;

    await supabase.from('profiles').update({ gems: profile.gems - 30 }).eq('id', user.id);

    const endsAt = Date.now() + 2 * 60 * 60 * 1000;
    await AsyncStorage.setItem('kalimat_booster_ends_at', String(endsAt));
    setBoosterActive(true);
    setBoosterEndsAt(endsAt);
  }

  // Auto-scroll when cards change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [cards, completedGroups]);

  // ── Submit word ──
  async function handleSubmit() {
    const word = inputText.trim();
    if (!word || isGameOver) return;

    const result = await validateWordAsync(word, currentLetter, usedWords, isEnglish);

    if (!result.valid) {
      const lang = isArabic ? 'ar' : 'en';
      setErrorMsg(ERROR_MESSAGES[lang][result.reason]);
      setInputText('');
      if (result.reason === 'wrong_letter') {
        subtractTime(PENALTY_WRONG_LETTER);
      } else if (result.reason === 'not_a_word') {
        subtractTime(PENALTY_NOT_A_WORD);
      }
      return;
    }

    // Calculate points (apply booster if active)
    const basePts = calculateClassicWordScore(word, activeCardIndex, letterIndex, isHotStreak);
    const pts = boosterActive ? basePts * 2 : basePts;

    // Lock this card as correct
    const updatedCards = [...cards];
    updatedCards[activeCardIndex] = {
      ...updatedCards[activeCardIndex],
      word,
      status: 'correct',
      points: pts,
    };
    setCards(updatedCards);
    setInputText('');
    setUsedWords(prev => [...prev, word]);

    // Update score
    const newScore = sessionScore + pts;
    setSessionScore(newScore);
    setLastPoints(pts);
    setShowPointsPopup(true);
    setTimeout(() => setShowPointsPopup(false), 1000);
    setWordsCompleted(prev => prev + 1);

    // Update high score
    if (newScore > highScore) {
      setHighScore(newScore);
      await AsyncStorage.setItem('kalimat_classic_highscore', String(newScore));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          classic_high_score: newScore,
          classic_high_score_updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }
    }

    // Hot streak — every 3 correct words
    const newHotCount = hotCount + 1;
    setHotCount(newHotCount);
    setIsHotStreak(newHotCount >= 3);

    // Add time for correct word
    addTime(TIME_PER_WORD);

    // Move to next card or next letter
    if (activeCardIndex < 2) {
      setActiveCardIndex(activeCardIndex + 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // All 3 cards done — bonus time + move to next letter
      addTime(TIME_PER_LETTER_BONUS);
      await handleNewLetter(updatedCards);
    }
  }

  async function handleNewLetter(doneCards: WordCard[]) {
    // Brief pause to show all 3 locked cards
    await new Promise(r => setTimeout(r, 600));

    // Save completed group
    setCompletedGroups(prev => [...prev, { letter: currentLetter, cards: doneCards }]);

    // Animate letter change
    Animated.sequence([
      Animated.timing(letterAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(letterAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const newLetter = getRandomLetter(currentLetter, isEnglish);
    setCurrentLetter(newLetter);
    setLetterIndex(prev => prev + 1);
    setCards(createEmptyCards());
    setActiveCardIndex(0);
    setInputText('');
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  async function handleGameOver(wrongWord: string, reason: string) {
    setTimerActive(false);

    // Play loss sound
    if (Audio) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/loss.mp3'),
          { shouldPlay: true }
        );
        setTimeout(() => sound.unloadAsync(), 2000);
      } catch {}
    }

    // Lock wrong card in red (skip if time_up with no word)
    if (wrongWord) {
      const updatedCards = [...cards];
      updatedCards[activeCardIndex] = {
        ...updatedCards[activeCardIndex],
        word: wrongWord,
        status: 'wrong',
        points: 0,
      };
      setCards(updatedCards);
    }
    setGameOverWord(wrongWord || '');
    setGameOverReason(reason);
    setIsGameOver(true);

    // Save session to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('classic_sessions').insert({
          player_id: user.id,
          score: sessionScore,
          words_solved: wordsCompleted,
          letters_completed: letterIndex,
          language,
        });

        // If this game was part of a friend challenge, report the score.
        // When both sides have reported, ChallengeSystem resolves & pays out.
        if (challengeId && user.id) {
          try {
            const { data: ch } = await supabase
              .from('friend_challenges')
              .select('wager_amount, wager_currency')
              .eq('id', challengeId)
              .single();
            const r = await ChallengeSystem.submitScore(challengeId, user.id, sessionScore);
            const wager = ch?.wager_amount || 0;
            const currency = (ch as any)?.wager_currency === 'gems' ? 'gems' : 'coins';
            setChallengeResult({
              won: r.resolved ? r.winnerId === user.id : null,
              myScore: r.myScore,
              oppScore: r.opponentScore,
              wager,
              currency,
            });
          } catch (e) {
            console.log('Challenge submit error', e);
          }
        }
      }
    } catch {}
  }

  function handlePlayAgain() {
    setCurrentLetter(getRandomLetter(undefined, isEnglish));
    setLetterIndex(0);
    setCards(createEmptyCards());
    setActiveCardIndex(0);
    setInputText('');
    setSessionScore(0);
    setWordsCompleted(0);
    setUsedWords([]);
    setIsHotStreak(false);
    setHotCount(0);
    setIsGameOver(false);
    setGameOverWord('');
    setGameOverReason('');
    setErrorMsg('');
    setCompletedGroups([]);
    setTimeLeft(INITIAL_TIME);
    setTimerActive(false);
    setGamePhase('ready');
  }

  function handleBack() {
    router.canGoBack() ? router.back() : router.replace('/');
  }

  // ── READY SCREEN ──
  if (gamePhase === 'ready') {
    return (
      <View style={styles.container}>
        <ClassicHeader
          sessionScore={sessionScore}
          highScore={highScore}
          isHotStreak={false}
          wordsCompleted={0}
          lettersCompleted={0}
          onBack={handleBack}
          onLeaderboard={() => setShowLeaderboard(true)}
        />
        <View style={styles.readyScreen}>
          {boosterActive && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12,
              paddingVertical: 8, paddingHorizontal: 14,
              borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 8,
            }}>
              <Text style={{ fontSize: 14 }}>🚀</Text>
              <Text style={{ color: '#FCD34D', fontSize: 13, fontWeight: '800' }}>
                {isArabic ? 'عملات مضاعفة ×2 نشطة' : 'Double coins ×2 active'}
              </Text>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>{boosterTimeLeft}</Text>
            </View>
          )}
          <Text style={styles.readyIcon}>🔤</Text>
          <Text style={styles.readyTitle}>
            {isArabic ? 'الكلاسيكي' : 'Classic Mode'}
          </Text>
          <Text style={styles.readyDesc}>
            {isArabic
              ? 'سيظهر لك حرف عربي\nاكتب ٣ كلمات تبدأ بهذا الحرف\nقبل انتهاء الوقت!'
              : 'A letter will appear\nWrite 3 words starting with it\nbefore time runs out!'}
          </Text>
          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>⏱️  {isArabic ? '٣٠ ثانية للبدء' : '30 seconds to start'}</Text>
            <Text style={styles.readyRule}>✅  {isArabic ? '+٥ ثواني لكل كلمة صحيحة' : '+5s per correct word'}</Text>
            <Text style={styles.readyRule}>🔥  {isArabic ? 'نقاط مضاعفة بعد ٣ كلمات متتالية' : '×2 points after 3 in a row'}</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartGame}>
            <Text style={styles.startBtnText}>
              {isArabic ? 'ابدأ اللعب' : 'Start Game'}
            </Text>
          </TouchableOpacity>
        </View>

        {showLeaderboard && (
          <ClassicLeaderboard onClose={() => setShowLeaderboard(false)} />
        )}
      </View>
    );
  }

  // ── COUNTDOWN SCREEN ──
  if (gamePhase === 'countdown') {
    return (
      <View style={styles.container}>
        <View style={styles.countdownScreen}>
          <Animated.Text
            style={[
              styles.countdownNumber,
              {
                opacity: countdownAnim,
                transform: [{
                  scale: countdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2.5, 1],
                  }),
                }],
              },
            ]}
          >
            {countdown > 0 ? toArabicNumerals(countdown) : (isArabic ? 'انطلق!' : 'GO!')}
          </Animated.Text>
          <Text style={styles.countdownHint}>
            {isArabic ? 'استعد...' : 'Get ready...'}
          </Text>
        </View>
      </View>
    );
  }

  // ── PLAYING SCREEN ──
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* HEADER */}
        <ClassicHeader
          sessionScore={sessionScore}
          highScore={highScore}
          isHotStreak={isHotStreak}
          wordsCompleted={wordsCompleted}
          lettersCompleted={letterIndex}
          onBack={handleBack}
          onLeaderboard={() => setShowLeaderboard(true)}
        />

        {/* BOOSTER BANNER */}
        {boosterActive ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12,
            marginHorizontal: 16, marginTop: 4, paddingVertical: 8, paddingHorizontal: 14,
            borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
          }}>
            <Text style={{ fontSize: 16 }}>🚀</Text>
            <Text style={{ color: '#FCD34D', fontSize: 14, fontWeight: '800' }}>
              {isArabic ? 'عملات مضاعفة ×2' : 'Double coins ×2'}
            </Text>
            <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700', marginLeft: 'auto' as any }}>
              {boosterTimeLeft}
            </Text>
          </View>
        ) : !isGameOver && gamePhase === 'playing' ? (
          <TouchableOpacity
            onPress={activateBooster}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 12,
              marginHorizontal: 16, marginTop: 4, paddingVertical: 8, paddingHorizontal: 14,
              borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
            }}
          >
            <Text style={{ fontSize: 14 }}>🚀</Text>
            <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>
              {isArabic ? 'ضاعف عملاتك لساعتين' : 'Double coins for 2 hours'}
            </Text>
            <Text style={{ color: '#C4B5FD', fontSize: 13, fontWeight: '800' }}>30💎</Text>
          </TouchableOpacity>
        ) : null}

        {/* CURRENT LETTER DISPLAY */}
        {!isGameOver && (
          <View style={styles.letterSection}>
            <Text style={styles.letterPrompt}>
              {isArabic ? 'اكتب ٣ كلمات تبدأ بـ' : 'Write 3 words starting with'}
            </Text>
            <Animated.View style={[styles.letterCircle, { opacity: letterAnim, transform: [{ scale: letterAnim }] }]}>
              <Text style={styles.letterText}>{currentLetter}</Text>
            </Animated.View>
            {isHotStreak && (
              <View style={styles.hotStreakBanner}>
                <Text style={styles.hotStreakEmoji}>🔥</Text>
                <Text style={styles.hotStreakText}>
                  {isArabic ? 'سلسلة حارة! نقاط مضاعفة ×٢' : 'Hot streak! ×2 points'}
                </Text>
              </View>
            )}

            {/* Timer bar */}
            <View style={styles.timerContainer}>
              <View style={styles.timerBarBg}>
                <Animated.View
                  style={[
                    styles.timerBarFill,
                    {
                      width: timerBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: timeLeft <= 5 ? '#EF4444'
                        : timeLeft <= 10 ? '#F59E0B'
                        : '#7C3AED',
                    },
                  ]}
                />
              </View>
              <View style={styles.timerTextRow}>
                <Text style={[
                  styles.timerText,
                  timeLeft <= 5 && { color: '#EF4444' },
                  timeLeft <= 10 && timeLeft > 5 && { color: '#F59E0B' },
                ]}>
                  ⏱️ {toArabicNumerals(timeLeft)}{isArabic ? 'ث' : 's'}
                </Text>
                {showTimeBonus && (
                  <Animated.Text style={[
                    styles.timeBonusText,
                    { opacity: timeBonusAnim },
                    lastTimeBonus < 0 && { color: '#EF4444' },
                  ]}>
                    {lastTimeBonus > 0 ? '+' : ''}{lastTimeBonus}{isArabic ? 'ث' : 's'}
                  </Animated.Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* SCROLLABLE CARDS AREA */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Completed letter groups */}
          {completedGroups.map((group, gi) => (
            <View key={`group-${gi}`} style={styles.completedGroup}>
              <View style={styles.completedGroupHeader}>
                <Text style={styles.completedGroupLetter}>{group.letter}</Text>
                <View style={styles.completedGroupLine} />
              </View>
              {group.cards.map((card, ci) => (
                <CompletedCard key={`${gi}-${ci}`} card={card} />
              ))}
            </View>
          ))}

          {/* Current cards */}
          {!isGameOver && (
            <View style={styles.currentGroup}>
              {cards.map((card, index) => (
                <WordCardItem
                  key={card.id}
                  card={card}
                  index={index}
                  isActive={index === activeCardIndex && card.status === 'empty'}
                  isPending={index > activeCardIndex && card.status === 'empty'}
                  currentLetter={currentLetter}
                  inputText={index === activeCardIndex && card.status === 'empty' ? inputText : ''}
                  onInputChange={(text: string) => { setInputText(text); setErrorMsg(''); }}
                  onSubmit={handleSubmit}
                  inputRef={index === activeCardIndex ? inputRef : null}
                  errorMsg={index === activeCardIndex ? errorMsg : ''}
                  cardNumber={index + 1}
                  isArabic={isArabic}
                />
              ))}
            </View>
          )}

          {/* Game Over */}
          {isGameOver && (
            <View style={styles.currentGroup}>
              {cards.map((card, index) => (
                <CompletedCard key={`final-${index}`} card={card} />
              ))}

              <GameOverScreen
                sessionScore={sessionScore}
                highScore={highScore}
                isNewHighScore={sessionScore >= highScore && sessionScore > 0}
                wordsCompleted={wordsCompleted}
                lettersCompleted={letterIndex}
                wrongWord={gameOverWord}
                currentLetter={currentLetter}
                gameOverReason={gameOverReason}
                onPlayAgain={handlePlayAgain}
                onLeaderboard={() => setShowLeaderboard(true)}
                isArabic={isArabic}
              />
              {challengeResult && (
                <ChallengeResultBanner result={challengeResult} isArabic={isArabic} />
              )}
            </View>
          )}
        </ScrollView>

        {/* Score popup */}
        <ScorePopup points={lastPoints} visible={showPointsPopup} boosted={boosterActive} />
      </KeyboardAvoidingView>

      {/* Leaderboard */}
      {showLeaderboard && (
        <ClassicLeaderboard onClose={() => setShowLeaderboard(false)} />
      )}
    </View>
  );
}

// ══════════════════════════════════════
// COMPLETED CARD (read-only)
// ══════════════════════════════════════

function CompletedCard({ card }: { card: WordCard }) {
  if (card.status === 'empty') return null;

  const isCorrect = card.status === 'correct';
  const bgColor = isCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)';
  const borderColor = isCorrect ? '#22C55E' : '#EF4444';
  const icon = isCorrect ? '✓' : '✗';
  const iconBg = isCorrect ? '#22C55E' : '#EF4444';

  return (
    <View style={[styles.cardRow, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
      <View style={[styles.cardBadge, { backgroundColor: iconBg }]}>
        <Text style={styles.cardBadgeText}>{icon}</Text>
      </View>
      <Text style={styles.cardWord}>{card.word}</Text>
      {isCorrect && card.points > 0 && (
        <Text style={styles.cardPoints}>+{card.points}⭐</Text>
      )}
    </View>
  );
}

// ══════════════════════════════════════
// WORD CARD ITEM (interactive)
// ══════════════════════════════════════

function WordCardItem({
  card, index, isActive, isPending, currentLetter,
  inputText, onInputChange, onSubmit,
  inputRef, errorMsg, cardNumber, isArabic,
}: {
  card: WordCard; index: number; isActive: boolean; isPending: boolean;
  currentLetter: string; inputText: string; onInputChange: (t: string) => void;
  onSubmit: () => void; inputRef: React.RefObject<TextInput> | null;
  errorMsg: string; cardNumber: number; isArabic: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (errorMsg && isActive) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [errorMsg]);

  // Already completed card
  if (card.status === 'correct' || card.status === 'wrong') {
    return <CompletedCard card={card} />;
  }

  const bgColor = isActive ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.04)';
  const borderColor = isActive ? '#7C3AED' : 'rgba(255,255,255,0.08)';

  return (
    <Animated.View
      style={[
        styles.cardRow,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: isActive ? 1.5 : 1,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
        },
      ]}
    >
      {/* Card number badge */}
      <View style={[styles.cardBadge, { backgroundColor: isActive ? '#7C3AED' : '#2A2A50' }]}>
        <Text style={styles.cardBadgeText}>{cardNumber}</Text>
      </View>

      {/* Letter hint */}
      <Text style={styles.cardLetterHint}>{currentLetter}</Text>

      {isActive ? (
        <View style={styles.cardInputArea}>
          <TextInput
            ref={inputRef}
            style={styles.cardInput}
            value={inputText}
            onChangeText={onInputChange}
            onSubmitEditing={onSubmit}
            placeholder={isArabic ? 'اكتب كلمة...' : 'Type a word...'}
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize={isArabic ? 'none' : 'characters'}
            autoCorrect={false}
            returnKeyType="done"
            textAlign={isArabic ? 'right' : 'left'}
          />
          {errorMsg ? (
            <Text style={styles.cardError}>{errorMsg}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.cardInputArea}>
          <Text style={styles.cardPendingText}>
            {isArabic ? 'في انتظارك...' : 'Waiting...'}
          </Text>
        </View>
      )}

      {/* Submit button */}
      {isActive && inputText.trim().length > 0 && (
        <TouchableOpacity style={styles.cardSubmitBtn} onPress={onSubmit}>
          <Text style={styles.cardSubmitText}>→</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ══════════════════════════════════════
// CHALLENGE RESULT BANNER
// ══════════════════════════════════════

function ChallengeResultBanner({
  result, isArabic,
}: {
  result: { won: boolean | null; myScore: number; oppScore: number | null; wager: number; currency: 'coins' | 'gems' };
  isArabic: boolean;
}) {
  const sym = result.currency === 'gems' ? '💎' : '🪙';
  const pending = result.oppScore == null;
  const tie = !pending && result.won === null;

  let title: string;
  let tone: string;
  if (pending) {
    title = isArabic ? '⌛ بانتظار الخصم…' : '⌛ Waiting for opponent…';
    tone = '#6366F1';
  } else if (tie) {
    title = isArabic ? '🤝 تعادل — رُدّت الرهانات' : '🤝 Tie — wagers refunded';
    tone = '#9CA3AF';
  } else if (result.won) {
    title = isArabic
      ? `🏆 فزت! +${result.wager * 2}${sym}`
      : `🏆 You won! +${result.wager * 2}${sym}`;
    tone = '#F59E0B';
  } else {
    title = isArabic ? '💔 خسرت التحدي' : '💔 You lost the challenge';
    tone = '#EF4444';
  }

  return (
    <View style={{
      marginTop: 12, padding: 14, borderRadius: 16,
      backgroundColor: `${tone}18`, borderWidth: 1.5, borderColor: tone,
      alignItems: 'center', gap: 6,
    }}>
      <Text style={{ color: tone, fontSize: 16, fontWeight: '900' }}>{title}</Text>
      {!pending && (
        <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '700' }}>
          {isArabic
            ? `نقاطك: ${result.myScore}   ·   نقاط الخصم: ${result.oppScore}`
            : `You: ${result.myScore}   ·   Opponent: ${result.oppScore}`}
        </Text>
      )}
    </View>
  );
}

// ══════════════════════════════════════
// GAME OVER SCREEN
// ══════════════════════════════════════

function GameOverScreen({
  sessionScore, highScore, isNewHighScore,
  wordsCompleted, lettersCompleted,
  wrongWord, currentLetter, gameOverReason,
  onPlayAgain, onLeaderboard, isArabic,
}: {
  sessionScore: number; highScore: number; isNewHighScore: boolean;
  wordsCompleted: number; lettersCompleted: number;
  wrongWord: string; currentLetter: string;
  gameOverReason: string;
  onPlayAgain: () => void; onLeaderboard: () => void;
  isArabic: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.gameOverContainer,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.gameOverIcon}>💔</Text>

      <Text style={styles.gameOverTitle}>
        {isArabic ? 'انتهت اللعبة' : 'Game Over'}
      </Text>

      {/* Reason explanation */}
      <View style={styles.wrongWordBox}>
        {gameOverReason === 'time_up' ? (
          <>
            <Text style={styles.wrongWordLabel}>
              ⏱️ {isArabic ? 'انتهى الوقت!' : 'Time\'s up!'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.wrongWordLabel}>
              {isArabic ? 'الكلمة لا تبدأ بـ' : 'Word does not start with'}{' '}
              <Text style={styles.wrongWordLetter}>{currentLetter}</Text>
            </Text>
            <Text style={styles.wrongWordText}>{wrongWord}</Text>
          </>
        )}
      </View>

      {/* Stats grid */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={styles.statValue}>{toArabicNumerals(sessionScore)}</Text>
          <Text style={styles.statLabel}>
            {isArabic ? 'نقاط الجلسة' : 'Session score'}
          </Text>
        </View>
        <View style={[styles.statCard, isNewHighScore && styles.statCardGold]}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={[styles.statValue, isNewHighScore && { color: COLORS.GOLD }]}>
            {toArabicNumerals(highScore)}
          </Text>
          <Text style={styles.statLabel}>
            {isNewHighScore ? '🎉 ' : ''}
            {isArabic ? 'أعلى نقاط' : 'High score'}
          </Text>
        </View>
      </View>

      {/* Words + letters row */}
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{toArabicNumerals(wordsCompleted)}</Text>
          <Text style={styles.miniStatLabel}>
            {isArabic ? 'كلمة صحيحة' : 'words correct'}
          </Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{toArabicNumerals(lettersCompleted)}</Text>
          <Text style={styles.miniStatLabel}>
            {isArabic ? 'حرف مكتمل' : 'letters done'}
          </Text>
        </View>
      </View>

      {/* Play again */}
      <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain}>
        <Text style={styles.playAgainText}>
          🔄  {isArabic ? 'العب مجدداً' : 'Play again'}
        </Text>
      </TouchableOpacity>

      {/* Leaderboard */}
      <TouchableOpacity style={styles.leaderboardBtnGO} onPress={onLeaderboard}>
        <Text style={styles.leaderboardBtnGOText}>
          🏅  {isArabic ? 'المتصدرون' : 'Leaderboard'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },

  // Ready screen
  readyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  readyIcon: { fontSize: 64, marginBottom: 16 },
  readyTitle: {
    fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 12,
  },
  readyDesc: {
    fontSize: 16, fontWeight: '600', color: COLORS.TEXT_SECONDARY,
    textAlign: 'center', lineHeight: 24, marginBottom: 24,
  },
  readyRules: {
    backgroundColor: '#1E1E3A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  readyRule: {
    fontSize: 15, fontWeight: '700', color: '#FFF',
  },
  startBtn: {
    backgroundColor: COLORS.PURPLE,
    height: 58,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#FFF', fontSize: 22, fontWeight: '900',
  },

  // Countdown screen
  countdownScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#7C3AED',
  },
  countdownHint: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },

  // Letter section
  letterSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  letterPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 10,
  },
  letterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
  },
  hotStreakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  hotStreakEmoji: { fontSize: 16 },
  hotStreakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Timer
  timerContainer: {
    width: '80%',
    alignItems: 'center',
    marginTop: 12,
  },
  timerBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.TEXT_SECONDARY,
  },
  timeBonusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
  },

  // Scroll area
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Completed group
  completedGroup: {
    marginBottom: 12,
    opacity: 0.6,
  },
  completedGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  completedGroupLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.PURPLE_LIGHT,
  },
  completedGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  currentGroup: {
    marginBottom: 12,
  },

  // Card row
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 10,
  },
  cardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  cardLetterHint: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(124,58,237,0.5)',
  },
  cardWord: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'right',
  },
  cardPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.GOLD,
  },

  // Input
  cardInputArea: {
    flex: 1,
  },
  cardInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    paddingVertical: 4,
    textAlign: 'right',
  },
  cardError: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'right',
    marginTop: 2,
  },
  cardPendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'right',
  },
  cardSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSubmitText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },

  // Game over
  gameOverContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  gameOverIcon: { fontSize: 56, marginBottom: 8 },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
  },
  wrongWordBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    width: '100%',
  },
  wrongWordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  wrongWordLetter: {
    fontWeight: '900',
    color: '#EF4444',
  },
  wrongWordText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EF4444',
    marginTop: 6,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E3A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  statCardGold: {
    borderColor: COLORS.GOLD,
    borderWidth: 2,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },

  miniStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  miniStat: { alignItems: 'center' },
  miniStatValue: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Buttons
  playAgainBtn: {
    backgroundColor: COLORS.PURPLE,
    height: 54,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  playAgainText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  leaderboardBtnGO: {
    backgroundColor: '#1E1E3A',
    height: 48,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  leaderboardBtnGOText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '700',
  },
});
