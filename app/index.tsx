import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/lib/constants';
import { useUserStore } from '../src/store/userStore';
import { useGameStore } from '../src/store/gameStore';
import { getDailyWord, getTodayDateString } from '../src/lib/words';
import { getDailyWordEN } from '../src/lib/words_en';
import { useLanguage } from '../src/lib/LanguageContext';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useDailyReward } from '../src/hooks/useDailyReward';
import { useCoins } from '../src/hooks/useCoins';
import DailyRewardModal from '../src/components/DailyRewardModal';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { useTicketStore } from '../src/store/ticketStore';
import { getTicketType, getSpinCost } from '../src/lib/gacha';
import { PlayerPhase, type PlayerPhaseValue } from '../src/lib/PlayerPhase';
import { useFocusEffect } from 'expo-router';
import { StreakManager, type StreakState, type StreakData } from '../src/lib/StreakManager';
import { StreakIcon } from '../src/components/StreakIcon';
import { StreakHistoryModal } from '../src/components/StreakHistoryModal';
import { FriendActivity, type FriendResult } from '../src/lib/FriendActivity';
import { FriendActivityBar } from '../src/components/FriendActivityBar';

const { width: W } = Dimensions.get('window');

let _splashChecked = false;

// ─── Mode card data ───
function getChallengeModes(isEn: boolean) {
  return [
    { id: 'duel', name: isEn ? 'Speed Duel' : 'تحدٍ سريع', emoji: '⚡', subtitle: isEn ? '1v1 — Bot or Player' : '1 ضد 1 — بوت أو لاعب', color: '#F59E0B', route: '/duel' },
    { id: 'rush', name: isEn ? 'Word Rush' : 'كلمة الساعة', emoji: '⏰', subtitle: isEn ? 'Hourly race' : 'سباق كل ساعة', color: '#0EA5E9', route: '/rush', isNew: true },
    { id: 'tournament', name: isEn ? 'Tournament' : 'المسابقة الكبرى', emoji: '🏆', subtitle: isEn ? '64 players weekly' : '64 لاعب أسبوعياً', color: '#EAB308', route: '/tournament', isNew: true },
  ];
}

function getGameModes(isEn: boolean) {
  return [
    { id: 'classic', name: isEn ? 'Classic' : 'الكلاسيكي', emoji: '∞', subtitle: isEn ? 'Unlimited' : 'بلا حدود', color: '#22C55E', route: '/classic' },
    { id: 'blitz', name: isEn ? 'Category Blitz' : 'تحدي الفئة', emoji: '💥', subtitle: isEn ? '90 seconds' : '90 ثانية', color: '#EC4899', route: '/blitz', isNew: true },
    { id: 'whoami', name: isEn ? 'Who Am I?' : 'من أنا؟', emoji: '🎯', subtitle: isEn ? 'Guess from clues' : 'خمّن من التلميحات', color: '#14B8A6', route: '/whoami', isNew: true },
    { id: 'chain', name: isEn ? 'Word Chain' : 'المتسلسلة', emoji: '🔗', subtitle: isEn ? 'Chain words' : 'سلسلة الكلمات', color: '#F97316', route: '/chain', isNew: true },
  ];
}

function ModeCardSmall({ name, emoji, subtitle, color, onPress, isNew }: any) {
  const { isEnglish } = useLanguage();
  return (
    <TouchableOpacity
      style={[styles.challengeCard, { borderColor: color + '40' }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{isEnglish ? 'NEW' : 'جديد'}</Text>
        </View>
      )}
      <Text style={styles.challengeEmoji}>{emoji}</Text>
      <Text style={styles.challengeName}>{name}</Text>
      <Text style={[styles.challengeSub, { color: color }]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ModeCardGrid({ name, emoji, subtitle, color, onPress, isNew }: any) {
  const { isEnglish } = useLanguage();
  return (
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{isEnglish ? 'NEW' : 'جديد'}</Text>
        </View>
      )}
      <Text style={styles.gridEmoji}>{emoji}</Text>
      <Text style={styles.gridName}>{name}</Text>
      <Text style={styles.gridSub}>{subtitle}</Text>
      <View style={[styles.gridAccent, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useUserStore();
  const { dailyCompleted } = useGameStore();
  const { theme: cosTheme } = useCosmeticStore();
  const ticketStore = useTicketStore();
  const { language, t, isEnglish } = useLanguage();
  const CHALLENGE_MODES = getChallengeModes(isEnglish);
  const GAME_MODES = getGameModes(isEnglish);

  useEffect(() => {
    if (!ticketStore.loaded) ticketStore.load();
  }, []);
  const p = user || { username: '؟', avatarColor: COLORS.PURPLE, currentStreak: 0, coins: 0, totalGames: 0, totalWins: 0, bestStreak: 0 };
  const [checkedSplash, setCheckedSplash] = useState(_splashChecked);

  const dailyReward = useDailyReward();
  const { earnCoins, earnGems } = useCoins();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [showStreakHistory, setShowStreakHistory] = useState(false);
  const [friendsWhoPlayed, setFriendsWhoPlayed] = useState<FriendResult[]>([]);

  useEffect(() => {
    if (checkedSplash && dailyReward.shouldShow) {
      const t = setTimeout(() => setShowRewardModal(true), 600);
      return () => clearTimeout(t);
    }
  }, [checkedSplash, dailyReward.shouldShow]);

  const handleClaimReward = async () => {
    const reward = await dailyReward.claim();
    if (reward.amount > 0) {
      if (reward.type === 'gems') {
        earnGems(reward.amount, 'streak_milestone');
      } else {
        earnCoins(reward.amount, 'daily_reward');
      }
    }
    setShowRewardModal(false);
  };

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayWord = isEnglish
    ? getDailyWordEN(getTodayDateString()).word
    : getDailyWord(getTodayDateString());
  const firstLetter = todayWord.charAt(0);

  const [phase, setPhase] = useState<PlayerPhaseValue>(1);
  const [showPhase2Intro, setShowPhase2Intro] = useState(false);

  // Re-check phase + streak when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      PlayerPhase.getPhase().then(p => {
        if (p === 2 && phase === 1) {
          setPhase(2);
          setShowPhase2Intro(true);
        } else if (p !== phase) {
          setPhase(p);
        }
      });
      StreakManager.getStreak().then(setStreak);
      StreakManager.getFullStreakData().then(setStreakData);
      // Load friend activity
      if (user?.id && user.id !== 'offline') {
        FriendActivity.loadFriendsWhoPlayedToday(user.id).then(setFriendsWhoPlayed);
      }
    }, [phase, user?.id])
  );

  // Splash + tutorial + username check
  useEffect(() => {
    if (_splashChecked) return;
    (async () => {
      await PlayerPhase.initialize();

      // Language selection first (before everything else)
      const languageSet = await AsyncStorage.getItem('kalimat_language_set');
      if (!languageSet) {
        router.replace('/language-select' as any);
        return;
      }

      // New player: show tutorial first
      const tutorialDone = await AsyncStorage.getItem('kalimat_tutorial_done');
      if (!tutorialDone) {
        router.replace('/tutorial' as any);
        return;
      }

      const seenSplash = await AsyncStorage.getItem('seen_splash');
      if (!seenSplash) {
        router.replace('/splash');
        return;
      }

      const currentPhase = await PlayerPhase.getPhase();
      setPhase(currentPhase);

      _splashChecked = true;
      setCheckedSplash(true);
    })();
  }, []);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.9)).current;
  const cardPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!checkedSplash) return;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardPulse, { toValue: 1.012, duration: 1200, useNativeDriver: true }),
        Animated.timing(cardPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [checkedSplash]);

  if (!checkedSplash) return <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]} />;

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Background glows */}
      <View style={[styles.glow, { top: -100, right: -80, backgroundColor: COLORS.PURPLE, opacity: 0.06 }]} />
      <View style={[styles.glow, { bottom: -120, left: -100, backgroundColor: '#22C55E', opacity: 0.04 }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── TOP BAR ── */}
        <Animated.View style={[styles.topBar, { opacity: fadeIn }]}>
          <View style={styles.leftIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/friends' as any)} activeOpacity={0.8}>
              <Text style={styles.iconBtnEmoji}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowRewardModal(true)} activeOpacity={0.8}>
              <Text style={styles.iconBtnEmoji}>🎁</Text>
              {dailyReward.shouldShow && <View style={styles.rewardDot} />}
            </TouchableOpacity>
          </View>
          {phase >= 2 && (
            <View style={styles.currencyBadges}>
              <TouchableOpacity style={[styles.coinsBadge, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]} onPress={() => router.push('/shop')} activeOpacity={0.8}>
                <Text style={styles.badgeNum}>{toArabicNumerals(p.coins || 0)}</Text>
                <Text style={styles.badgeIcon}>🪙</Text>
                <Text style={styles.badgePlus}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gemsBadge, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]} onPress={() => router.push('/shop?tab=gems' as any)} activeOpacity={0.8}>
                <Text style={styles.badgeNum}>{toArabicNumerals((p as any).gems || 0)}</Text>
                <Text style={styles.badgeIcon}>💎</Text>
                <Text style={styles.badgePlus}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ticketMini, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]} onPress={() => router.push('/spin' as any)} activeOpacity={0.8}>
                <Text style={styles.badgeNum}>{toArabicNumerals(ticketStore.bronze)}</Text>
                <Text style={styles.badgeIcon}>🎫</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── TITLE ── */}
        <Animated.View style={[styles.titleArea, { opacity: fadeIn, transform: [{ scale: titleScale }] }]}>
          <Text style={styles.titleAr}>{t('الكلمة', 'The Word')}</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.titleSub}>{t('لعبة كلمات', 'WORD PUZZLE')}</Text>
        </Animated.View>

        {/* ── STREAK BANNER ── */}
        {streakData && streakData.current > 0 && (
          <View style={[styles.streakBanner, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            <StreakIcon
              streak={streakData.current}
              isFrozen={streakData.isFrozen}
              onPress={() => setShowStreakHistory(true)}
            />
            <View style={{ flex: 1, alignItems: isEnglish ? 'flex-start' : 'flex-end' }}>
              <Text style={styles.streakCount}>
                {toArabicNumerals(streakData.current)} {streakData.current === 1 ? t('يوم', 'day') : t('أيام', 'days')}
              </Text>
              <Text style={styles.streakLabel}>
                {streakData.isFrozen ? t('سلسلة مجمّدة ❄️', 'Streak frozen ❄️') : t('سلسلتك الحالية', 'Current streak')}
              </Text>
            </View>
            {streakData.freezesAvailable > 0 && (
              <View style={styles.freezeBadge}>
                <Text style={{ fontSize: 14 }}>🛡️</Text>
                <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>{toArabicNumerals(streakData.freezesAvailable)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── FRIEND ACTIVITY ── */}
        {friendsWhoPlayed.length > 0 && !dailyCompleted && (
          <FriendActivityBar friends={friendsWhoPlayed} />
        )}

        {/* ── SECTION 1: يومي ── */}
        <Text style={[styles.sectionTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('📅 يومي', '📅 Daily')}</Text>
        <Animated.View style={{ transform: [{ scale: cardPulse }] }}>
          <TouchableOpacity style={styles.dailyCard} activeOpacity={0.9} onPress={() => router.push('/daily')}>
            <View style={[styles.dailyTop, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              <Text style={styles.dailyLabel}>{t('كلمة اليوم', "Today's Word")}</Text>
              <View style={styles.dailyDot} />
            </View>
            <View style={[styles.squaresRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.square}>
                  {dailyCompleted && <Text style={styles.squareText}>✓</Text>}
                </View>
              ))}
            </View>
            <Text style={styles.teaser}>{t(`الكلمة تبدأ بحرف: ${firstLetter}`, `Starts with: ${firstLetter}`)}</Text>
            <View style={[styles.countdownRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              <Text style={styles.countdownLabel}>{t('وقت متبقي', 'Time left')}</Text>
              <Text style={styles.countdownTime}>{timeLeft}</Text>
            </View>
            <View style={styles.dailyBtn}>
              <Text style={styles.dailyBtnText}>
                {dailyCompleted
                  ? t('عرض النتيجة', 'View Result')
                  : t('العب الآن ◀', '▶ Play Now')}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── SECTION 2: Duel + Classic side by side ── */}
        <View style={[styles.dualCardRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity
            style={[styles.dualCard, { borderColor: '#F59E0B40' }]}
            activeOpacity={0.85}
            onPress={() => router.push('/duel')}
          >
            <Text style={styles.dualEmoji}>⚡</Text>
            <Text style={styles.dualName}>{t('تحدٍ سريع', 'Speed Duel')}</Text>
            <Text style={[styles.dualSub, { color: '#F59E0B' }]}>{t('1 ضد 1', '1v1')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dualCard, { borderColor: '#22C55E40' }]}
            activeOpacity={0.85}
            onPress={() => router.push('/classic')}
          >
            <Text style={styles.dualEmoji}>∞</Text>
            <Text style={styles.dualName}>{t('الكلاسيكي', 'Classic')}</Text>
            <Text style={[styles.dualSub, { color: '#22C55E' }]}>{t('بلا حدود', 'Unlimited')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── SPIN NOTIFICATION ── */}
        {phase >= 2 && ticketStore.bronze >= 5 && (
          <TouchableOpacity
            style={[styles.spinNotif, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}
            activeOpacity={0.85}
            onPress={() => router.push('/spin' as any)}
          >
            <Text style={{ fontSize: 28 }}>🎡</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.spinNotifTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('دوران مجاني متاح!', 'Free spin available!')}</Text>
              <Text style={[styles.spinNotifSub, { textAlign: isEnglish ? 'left' : 'right' }]}>{isEnglish ? `You have ${ticketStore.bronze} bronze tickets` : `لديك ${toArabicNumerals(ticketStore.bronze)} تذكرة برونزية`}</Text>
            </View>
            <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '700' }}>{isEnglish ? '▶ Spin' : 'أدر ◀'}</Text>
          </TouchableOpacity>
        )}

        {/* ── ALL MODES ── */}
        <TouchableOpacity style={styles.allModesBtn} activeOpacity={0.85} onPress={() => router.push('/modes' as any)}>
          <Text style={styles.allModesBtnText}>{t('كل الألعاب ◀', '▶ All Games')}</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Bottom nav is now in _layout.tsx */}
      <View style={{ height: 72 }} />

      <DailyRewardModal
        visible={showRewardModal}
        currentDay={dailyReward.currentDay}
        claimedToday={dailyReward.claimedToday}
        gemDay={dailyReward.gemDay}
        gemAmount={dailyReward.gemAmount}
        missedDays={dailyReward.missedDays}
        timeLeft={timeLeft}
        onClaim={handleClaimReward}
        onClose={() => setShowRewardModal(false)}
      />

      {/* Streak History Modal */}
      {showStreakHistory && streakData && (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <StreakHistoryModal
            streakData={streakData}
            onClose={() => setShowStreakHistory(false)}
          />
        </Modal>
      )}

      {/* Phase 2 Introduction Modal */}
      <Phase2Introduction
        visible={showPhase2Intro}
        onDismiss={() => setShowPhase2Intro(false)}
        onPhaseUpdated={() => setPhase(3)}
      />
    </View>
  );
}

// ─── Phase 2 Introduction ───
function Phase2Introduction({ visible, onDismiss, onPhaseUpdated }: {
  visible: boolean;
  onDismiss: () => void;
  onPhaseUpdated: () => void;
}) {
  const { t, isEnglish } = useLanguage();
  if (!visible) return null;

  const features = [
    { emoji: '🎨', title: t('خصّص ملفك', 'Customize Profile'), desc: t('أيقونات وإطارات وخلفيات حصرية', 'Exclusive icons, frames & backgrounds') },
    { emoji: '🪙', title: t('اكسب عملات', 'Earn Coins'), desc: t('بالفوز والتحديات اليومية', 'By winning and daily challenges') },
    { emoji: '🎡', title: t('العجلة الذهبية', 'Golden Wheel'), desc: t('تذاكر مجانية من الإعلانات', 'Free tickets from ads') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={p2s.overlay}>
        <View style={p2s.sheet}>
          <Text style={p2s.title}>{t('أحسنت! 🎉', 'Well Done! 🎉')}</Text>
          <Text style={p2s.subtitle}>{t('لقد اكتشفت كيفية اللعب — هناك المزيد', "You've learned how to play — there's more!")}</Text>

          {features.map((f, i) => (
            <View key={i} style={[p2s.featureRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[p2s.featureName, { textAlign: isEnglish ? 'left' : 'right' }]}>{f.title}</Text>
                <Text style={[p2s.featureDesc, { textAlign: isEnglish ? 'left' : 'right' }]}>{f.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={p2s.ctaBtn}
            activeOpacity={0.85}
            onPress={async () => {
              await PlayerPhase.markPhase2Seen();
              onPhaseUpdated();
              onDismiss();
              router.push('/shop');
            }}
          >
            <Text style={p2s.ctaText}>{t('استكشف المتجر ✨', '✨ Explore Shop')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await PlayerPhase.markPhase2Seen();
              onPhaseUpdated();
              onDismiss();
            }}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <Text style={p2s.laterText}>{t('ربما لاحقاً', 'Maybe Later')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const p2s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E3A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, gap: 14,
    borderTopWidth: 2, borderColor: '#7C3AED',
  },
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#A78BFA', textAlign: 'center', marginBottom: 4 },
  featureRow: {
    alignItems: 'center', gap: 14,
    backgroundColor: '#0D0730', borderRadius: 16, padding: 16,
  },
  featureName: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  featureDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  ctaBtn: {
    height: 56, backgroundColor: '#7C3AED', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  ctaText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  laterText: { color: '#6B7280', fontSize: 15 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0730',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 96,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    marginBottom: 8,
  },
  leftIcons: {
    flexDirection: 'column',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  iconBtnEmoji: {
    fontSize: 20,
  },
  rewardDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0D0730',
  },
  currencyBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  coinsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  gemsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  badgePlus: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
  badgeIcon: { fontSize: 16 },
  badgeNum: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // Title
  titleArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleAr: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  titleAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.PURPLE,
    marginTop: 10,
    marginBottom: 8,
  },
  titleSub: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PURPLE_LIGHT,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'right',
    marginTop: 20,
    marginBottom: 12,
  },

  // Dual card row (Duel + Classic)
  dualCardRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 20,
  },
  dualCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  dualEmoji: {
    fontSize: 36,
  },
  dualName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  dualSub: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Daily card
  dailyCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: COLORS.PURPLE,
    gap: 14,
    shadowColor: COLORS.PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dailyTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  dailyLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.PURPLE_LIGHT,
  },
  dailyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  squaresRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 10,
  },
  square: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2A2A50',
    borderWidth: 1.5,
    borderColor: '#3D3D6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareText: {
    fontSize: 20,
    color: '#22C55E',
    fontWeight: 'bold',
  },
  teaser: {
    fontSize: 15,
    color: COLORS.PURPLE_LIGHT,
    textAlign: 'center',
  },
  countdownRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  countdownTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  dailyBtn: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Challenge cards (horizontal scroll)
  challengeRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingRight: 2,
  },
  challengeCard: {
    width: 140,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  challengeEmoji: {
    fontSize: 32,
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  challengeSub: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Grid cards (2x2)
  gridContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (W - 52) / 2,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  gridEmoji: {
    fontSize: 36,
  },
  gridName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  gridSub: {
    fontSize: 12,
    color: '#A78BFA',
  },
  gridAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  // NEW badge
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },

  // Blind card
  blindCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444' + '40',
    padding: 18,
    alignItems: 'center',
    gap: 14,
  },
  blindLeft: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  proBadge: {
    backgroundColor: '#EF4444' + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  blindTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  blindSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  blindEmoji: {
    fontSize: 40,
  },

  // All modes button
  allModesBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D2D50',
    marginTop: 16,
  },
  ticketMini: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.25)',
  },
  spinNotif: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1208',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    padding: 14,
    marginTop: 16,
  },
  spinNotifTitle: {
    color: '#FCD34D',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  spinNotifSub: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'right',
  },
  allModesBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#A78BFA',
  },

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2D2D50',
    height: 72,
    alignItems: 'center',
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  navDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Streak banner
  streakBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.GOLD + '12',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.GOLD + '30',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 32,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.GOLD,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#22C55E15',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
