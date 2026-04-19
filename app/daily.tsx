import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Modal, Pressable, TouchableOpacity,
  Animated, Dimensions, Share, Linking, ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useDaily } from '../src/hooks/useDaily';
import { GuessGrid } from '../src/components/GuessGrid';
import { ArabicKeyboard } from '../src/components/ArabicKeyboard';
import { EnglishKeyboard } from '../src/components/EnglishKeyboard';
import { WordEngine } from '../src/engine/WordEngine';
import {
  formatArabicDate, generateShareText, toArabicNumerals,
} from '../src/engine/ShareCard';
import { useUserStore } from '../src/store/userStore';
import { COLORS, GAME } from '../src/lib/constants';
import { AR } from '../src/lib/strings';
import { getDailyWordCategory } from '../src/lib/words';
import { getDailyWordCategoryEN } from '../src/lib/words_en';
import { getCategoryEmoji, getCategoryColor } from '../src/lib/categories';
import { HintBar } from '../src/components/HintBar';
import { RewardedAdButton } from '../src/components/RewardedAdButton';
import { adManager } from '../src/lib/AdManager';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { PlayerPhase, type PlayerPhaseValue } from '../src/lib/PlayerPhase';
import { useLanguage } from '../src/lib/LanguageContext';
import { StreakManager, type PlayResult, type MilestoneReward, type StreakData } from '../src/lib/StreakManager';
import { StreakMilestoneModal } from '../src/components/StreakMilestoneModal';
import { StreakIcon } from '../src/components/StreakIcon';
import { StreakHistoryModal } from '../src/components/StreakHistoryModal';
import { IceShatterAnimation } from '../src/components/IceShatterAnimation';
import { NotificationPermissionPrompt } from '../src/components/NotificationPermissionPrompt';
import { WinAnimationPlayer } from '../src/components/WinAnimations';
import { ProfileBackground } from '../src/components/ProfileBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SH } = Dimensions.get('window');
const HEADER_H = 56;


export default function DailyScreen() {
  const { game, isLoading, dailyCompleted, shake, todayDate, addLetter, deleteLetter, submitGuess } = useDaily();
  const { user } = useUserStore();
  const { theme: cosTheme } = useCosmeticStore();
  const { language, t, isEnglish } = useLanguage();
  const [showResult, setShowResult] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedPositions, setRevealedPositions] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<PlayerPhaseValue>(3);
  const [phaseTransitioned, setPhaseTransitioned] = useState(false);
  const [streakResult, setStreakResult] = useState<PlayResult | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneReward, setMilestoneReward] = useState<MilestoneReward>({});
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showWinAnim, setShowWinAnim] = useState(true);
  const [gameDuration, setGameDuration] = useState(0);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [showStreakHistory, setShowStreakHistory] = useState(false);
  const [showIceShatter, setShowIceShatter] = useState(false);
  const gameStartTime = useRef(Date.now());
  const winOverlayOpacity = useRef(new Animated.Value(0.5)).current;
  const { activeWinAnimationId, activeProfileBgId } = useCosmeticStore();

  useEffect(() => {
    PlayerPhase.getPhase().then(setPhase);
    // Check if freeze should be applied, then load streak data
    (async () => {
      await StreakManager.checkAndApplyFreeze();
      const data = await StreakManager.getFullStreakData();
      setStreakData(data);
    })();
  }, []);

  function handleRevealLetter(position: number, letter: string) {
    setRevealedPositions(prev => ({ ...prev, [position]: letter }));
    setHintsUsed(prev => prev + 1);
    showToast(t(`💡 الحرف ${position + 1}: ${letter}`, `💡 Letter ${position + 1}: ${letter}`), 'success', 2000);
  }

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info', duration = 1800) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ msg, type });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }

  // Show result modal when game ends + track phase
  useEffect(() => {
    if (game && (game.gameStatus === 'won' || game.gameStatus === 'lost')) {
      // Record game completion for phase tracking
      if (!phaseTransitioned) {
        setPhaseTransitioned(true);
        PlayerPhase.recordGameCompleted().then(newPhase => {
          if (newPhase !== phase) setPhase(newPhase);
        });
        PlayerPhase.recordPhase3Game().then(shouldShowAd => {
          if (shouldShowAd) adManager.showInterstitial();
        });
      }
    }

    if (game && game.gameStatus === 'won') {
      setGameDuration(Math.round((Date.now() - gameStartTime.current) / 1000));
      setShowWinAnim(true);
      winOverlayOpacity.setValue(0.5);
      // Record streak
      StreakManager.recordDailyPlay(game.attempts, true).then(async (result) => {
        setStreakResult(result);
        if (result.milestoneReached) {
          setMilestoneReward(StreakManager.getMilestoneReward(result.milestoneReached));
        }
        // If ice just thawed — show shatter animation
        if (result.frozeThawed) {
          setShowIceShatter(true);
        }
        // Refresh streak data
        const newData = await StreakManager.getFullStreakData();
        setStreakData(newData);
        // Show notification prompt after first win (if never shown)
        const promptShown = await AsyncStorage.getItem('kalimat_notification_prompt_shown');
        if (!promptShown) {
          setShowNotifPrompt(true);
        }
      });

      const timer = setTimeout(() => {
        const msg = isEnglish
          ? `Got it in ${game.attempts} attempts! 🎉`
          : `أصبت في ${game.attempts} محاولات 🎉`;
        showToast(msg, 'success', 2500);
        setTimeout(() => setShowResult(true), 1200);
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (game && game.gameStatus === 'lost') {
      // Still record as played (streak continues if they played, even if lost)
      StreakManager.recordDailyPlay(game.attempts, false).then(async (result) => {
        setStreakResult(result);
        if (result.frozeThawed) {
          setShowIceShatter(true);
        }
        const newData = await StreakManager.getFullStreakData();
        setStreakData(newData);
      });

      const timer = setTimeout(() => {
        const msg = isEnglish
          ? `The answer was: ${game.targetWord}`
          : `كان الجواب: ${game.targetWord}`;
        showToast(msg, 'error', 4000);
        setTimeout(() => setShowResult(true), 2000);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [game?.gameStatus]);

  // Intercept submit to show toasts
  function handleSubmit() {
    if (!game || game.gameStatus !== 'playing') return;
    if (game.currentGuess.length < game.targetWord.length) {
      showToast(t('أكمل الكلمة أولاً ✏️', 'Complete the word first ✏️'), 'info');
      return;
    }
    submitGuess();
  }

  async function handleShare() {
    if (!game) return;
    const text = generateShareText(
      todayDate, game.results, game.gameStatus === 'won',
      game.attempts, user?.currentStreak || 0
    );
    // Try WhatsApp first, fallback to system share
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) { await Linking.openURL(waUrl); return; }
    } catch {}
    await Share.share({ message: text });
  }

  if (isLoading || !game) {
    return <View style={styles.container} />;
  }

  const keyboardStates = isEnglish
    ? WordEngine.getKeyboardStatesEN(game.guesses, game.results)
    : WordEngine.getKeyboardStates(game.guesses, game.results);
  const canSubmit = game.currentGuess.length === game.targetWord.length;
  const attemptNum = game.guesses.length + (game.gameStatus === 'playing' ? 1 : 0);
  const attemptText = isEnglish
    ? `Attempt ${attemptNum} of ${GAME.MAX_ATTEMPTS}`
    : `المحاولة ${toArabicNumerals(attemptNum)} من ${toArabicNumerals(GAME.MAX_ATTEMPTS)}`;
  const dailyCat = isEnglish ? getDailyWordCategoryEN(todayDate) : getDailyWordCategory(todayDate);
  const dailyCatColor = getCategoryColor(dailyCat);
  const dailyCatEmoji = getCategoryEmoji(dailyCat);

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('كلمات اليوم', 'Daily Word')}</Text>
          <Text style={styles.headerDate}>{isEnglish ? todayDate : formatArabicDate(todayDate)}</Text>
        </View>
        <View style={[styles.headerRight, { alignItems: isEnglish ? 'flex-end' : 'flex-start' }]}>
          {streakData && (
            <StreakIcon
              streak={streakData.current}
              isFrozen={streakData.isFrozen}
              onPress={() => setShowStreakHistory(true)}
            />
          )}
          {phase >= 2 && <Text style={styles.coinsText}>🪙 {isEnglish ? (user?.coins || 0) : toArabicNumerals(user?.coins || 0)}</Text>}
        </View>
      </View>

      {/* ── CATEGORY BADGE ── */}
      <View style={styles.catRow}>
        <View style={[styles.catPill, { backgroundColor: dailyCatColor + '18', borderColor: dailyCatColor + '40', flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <Text style={styles.catEmoji}>{dailyCatEmoji}</Text>
          <Text style={[styles.catText, { color: dailyCatColor }]}>{dailyCat}</Text>
        </View>
      </View>

      {/* ── GRID (45% of remaining) ── */}
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

      {/* ── STATUS BAR + HINTS ── */}
      <View style={[styles.statusBar, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <Text style={styles.statusText}>{attemptText}</Text>
      </View>

      {phase >= 2 && (
        <HintBar
          game={game}
          onRevealLetter={handleRevealLetter}
          hintsUsed={hintsUsed}
          maxHints={2}
          disabled={game.gameStatus !== 'playing'}
        />
      )}

      {/* ── KEYBOARD (55% of remaining) ── */}
      {isEnglish ? (
        <EnglishKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={handleSubmit}
          letterStates={keyboardStates}
          disabled={game.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      ) : (
        <ArabicKeyboard
          onLetterPress={addLetter}
          onDelete={deleteLetter}
          onEnter={handleSubmit}
          letterStates={keyboardStates}
          disabled={game.gameStatus !== 'playing'}
          canSubmit={canSubmit}
        />
      )}

      {/* ── TOAST ── */}
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

      {/* ── STREAK MILESTONE MODAL ── */}
      {streakResult?.milestoneReached && (
        <StreakMilestoneModal
          visible={showMilestone}
          milestone={streakResult.milestoneReached}
          reward={milestoneReward}
          onClaim={() => setShowMilestone(false)}
        />
      )}

      {/* ── NOTIFICATION PERMISSION (after first win) ── */}
      <Modal visible={showNotifPrompt} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <NotificationPermissionPrompt onDone={() => setShowNotifPrompt(false)} />
        </View>
      </Modal>

      {/* ── STREAK HISTORY MODAL ── */}
      {showStreakHistory && streakData && (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <StreakHistoryModal
            streakData={streakData}
            onClose={() => setShowStreakHistory(false)}
          />
        </Modal>
      )}

      {/* ── ICE SHATTER ANIMATION ── */}
      {showIceShatter && streakData && (
        <IceShatterAnimation
          streakNumber={streakData.current}
          onDone={() => setShowIceShatter(false)}
        />
      )}

      {/* ── WIN / LOSS MODAL ── */}
      <Modal visible={showResult} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.winOverlay}>
          {/* Profile background behind everything */}
          {game.gameStatus === 'won' && activeProfileBgId && activeProfileBgId !== 'none' && (
            <ProfileBackground theme={activeProfileBgId} />
          )}

          {/* Dark overlay — fades after animation */}
          <Animated.View pointerEvents="none" style={[styles.winDarkOverlay, { opacity: winOverlayOpacity }]} />

          {/* WIN ANIMATION — fills entire screen */}
          {game.gameStatus === 'won' && showWinAnim && (
            <WinAnimationPlayer
              animationId={activeWinAnimationId || 'default'}
              onDone={() => {
                setShowWinAnim(false);
                Animated.timing(winOverlayOpacity, {
                  toValue: 0.15, duration: 600, useNativeDriver: true,
                }).start();
              }}
            />
          )}

          <ScrollView contentContainerStyle={styles.winScrollContent} showsVerticalScrollIndicator={false}>
            {/* Win Card */}
            <WinCard
              word={game.targetWord}
              category={dailyCat}
              categoryColor={dailyCatColor}
              categoryEmoji={dailyCatEmoji}
              attempts={game.attempts}
              streak={user?.currentStreak || 0}
              duration={gameDuration}
              isWin={game.gameStatus === 'won'}
              isEnglish={isEnglish}
              t={t}
              onShare={handleShare}
              onLeaderboard={() => { setShowResult(false); router.push('/leaderboard'); }}
              phase={phase}
              streakFreezeUsed={!!streakResult?.freezeUsed}
              onClose={() => {
                setShowResult(false);
                if (streakResult?.milestoneReached) {
                  setTimeout(() => setShowMilestone(true), 400);
                }
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── WIN CARD COMPONENT ───
function WinCard({ word, category, categoryColor, categoryEmoji, attempts, streak, duration, isWin, isEnglish, t, onShare, onLeaderboard, phase, streakFreezeUsed, onClose }: {
  word: string; category: string; categoryColor: string; categoryEmoji: string;
  attempts: number; streak: number; duration: number; isWin: boolean;
  isEnglish: boolean; t: (ar: string, en: string) => string;
  onShare: () => void; onLeaderboard: () => void;
  phase: number; streakFreezeUsed: boolean; onClose: () => void;
}) {
  const cardSlide = useRef(new Animated.Value(400)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const displayAttempts = isEnglish ? String(attempts) : toArabicNumerals(attempts);
  const displayStreak = isEnglish ? String(streak) : toArabicNumerals(streak);
  const displayDuration = isEnglish ? String(duration) : toArabicNumerals(duration);

  return (
    <Animated.View style={[winStyles.card, {
      opacity: cardOpacity,
      transform: [{ translateY: cardSlide }],
    }]}>
      {/* Title */}
      <Text style={winStyles.title}>
        {isWin ? t('ممتاز!', 'Amazing!') : t('حظاً أوفر غداً', 'Better luck tomorrow')}
      </Text>
      <Text style={winStyles.subtitle}>
        {isWin
          ? isEnglish ? `Got it in ${attempts} attempts` : `أصبت في ${toArabicNumerals(attempts)} محاولات`
          : isEnglish ? `The answer was: ${word}` : `كان الجواب: ${word}`}
      </Text>

      {/* Word display */}
      <View style={winStyles.wordSection}>
        <Text style={winStyles.wordLabel}>{t('كلمة اليوم', "Today's Word")}</Text>
        <Text style={winStyles.wordText}>{word}</Text>
        <View style={[winStyles.categoryPill, { backgroundColor: categoryColor + '20', borderColor: categoryColor + '40', flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <Text style={{ fontSize: 14 }}>{categoryEmoji}</Text>
          <Text style={[winStyles.categoryText, { color: categoryColor }]}>{category}</Text>
        </View>
      </View>

      {/* 3 Stat cards */}
      {isWin && (
        <View style={[winStyles.statsRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <StatCard3D label={t('محاولات', 'Tries')} value={displayAttempts} icon="🎯" color="#7C3AED" delay={200} />
          <StatCard3D label={t('سلسلة', 'Streak')} value={displayStreak} icon="🔥" color="#F59E0B" delay={400} />
          <StatCard3D label={t('ثانية', 'Seconds')} value={displayDuration} icon="⚡" color="#22C55E" delay={600} />
        </View>
      )}

      {/* Action buttons */}
      <View style={[winStyles.btnsRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <Pressable style={[winStyles.shareBtn, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]} onPress={onShare}>
          <Text style={winStyles.shareBtnIcon}>📤</Text>
          <Text style={winStyles.shareBtnText}>{t('شارك النتيجة', 'Share Result')}</Text>
        </Pressable>
        <Pressable style={[winStyles.leaderBtn, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]} onPress={onLeaderboard}>
          <Text style={winStyles.leaderBtnIcon}>🏆</Text>
          <Text style={winStyles.leaderBtnText}>{t('المتصدرون', 'Leaderboard')}</Text>
        </Pressable>
      </View>

      {/* Ad reward */}
      {phase >= 2 && <RewardedAdButton label={t('احصل على 🪙10 إضافية', 'Get 🪙10 bonus coins')} />}

      {/* Streak freeze notice */}
      {streakFreezeUsed && (
        <View style={winStyles.freezeNotice}>
          <Text style={winStyles.freezeText}>
            🛡️ {t('تم استخدام حماية السلسلة تلقائياً', 'Streak freeze used automatically')}
          </Text>
        </View>
      )}

      {/* Close / footer */}
      <Pressable onPress={onClose} style={winStyles.closeArea}>
        <Text style={winStyles.footerText}>{t('عد غداً لكلمة جديدة ⏰', 'Come back tomorrow for a new word ⏰')}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── 3D STAT CARD ───
function StatCard3D({ label, value, icon, color, delay }: {
  label: string; value: string; icon: string; color: string; delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [-15, 0], outputRange: ['-15deg', '0deg'] });

  return (
    <Animated.View style={[winStyles.statCard, {
      borderColor: color + '40',
      transform: [{ scale: scaleAnim }, { rotate }],
    }]}>
      <Text style={winStyles.statIcon}>{icon}</Text>
      <Text style={[winStyles.statValue, { color }]}>{value}</Text>
      <Text style={winStyles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── WIN CARD STYLES ───
const winStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 30, 58, 0.85)',
    borderRadius: 28,
    padding: 24,
    width: '92%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    // Frosted glass effect
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    } : { elevation: 20 }),
    overflow: 'hidden',
  },
  title: {
    fontSize: 34, fontWeight: '900', color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, color: '#A78BFA', textAlign: 'center', marginTop: -4,
  },
  wordSection: {
    width: '100%', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13, 7, 48, 0.6)', borderRadius: 20, padding: 20,
  },
  wordLabel: { fontSize: 12, color: '#8B8BAD', textTransform: 'uppercase', letterSpacing: 1 },
  wordText: { fontSize: 42, fontWeight: '900', color: '#FFF' },
  categoryPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1,
  },
  categoryText: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row-reverse', gap: 10, width: '100%', justifyContent: 'center',
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(13, 7, 48, 0.6)', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#8B8BAD', fontWeight: '600' },
  btnsRow: {
    flexDirection: 'row-reverse', gap: 10, width: '100%', marginTop: 4,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#7C3AED', height: 52, borderRadius: 16,
  },
  shareBtnIcon: { fontSize: 18 },
  shareBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  leaderBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#7C3AED',
  },
  leaderBtnIcon: { fontSize: 18 },
  leaderBtnText: { color: '#A78BFA', fontSize: 15, fontWeight: '700' },
  freezeNotice: {
    backgroundColor: '#22C55E20', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  freezeText: {
    color: '#22C55E', fontSize: 14, fontWeight: '700', textAlign: 'center',
  },
  closeArea: { paddingVertical: 8 },
  footerText: { fontSize: 14, color: '#8B8BAD' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },

  // Header
  header: {
    height: HEADER_H,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E3A',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerDate: { fontSize: 13, color: COLORS.PURPLE_LIGHT },
  headerRight: { minWidth: 80 },
  coinsText: { fontSize: 16, fontWeight: '800', color: COLORS.GOLD },

  // Category
  catRow: { alignItems: 'center', marginTop: 6 },
  catPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catText: { fontSize: 13, fontWeight: '700' },

  // Grid
  gridArea: {
    flex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status bar
  statusBar: {
    height: 28,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statusText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },

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

  // Notification modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Win screen overlay
  winOverlay: {
    flex: 1,
    backgroundColor: '#0D0730',
  },
  winDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  winScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    zIndex: 10,
  },
});
