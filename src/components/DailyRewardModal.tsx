import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { COLORS } from '../lib/constants';
import { DAILY_REWARDS, getRewardForDay } from '../hooks/useDailyReward';
import { toArabicNumerals } from '../engine/ShareCard';
import { useLanguage } from '../lib/LanguageContext';

const { width: W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  /** Next day to claim (0-6), or 7 if cycle complete */
  currentDay: number;
  /** Whether today's reward has already been claimed */
  claimedToday: boolean;
  /** Gem day for this cycle (1-indexed), or null */
  gemDay: number | null;
  gemAmount: number;
  /** 0-indexed days in this cycle that were missed */
  missedDays: number[];
  /** Countdown to next reward (HH:MM:SS) — shown when claimed */
  timeLeft?: string;
  onClaim: () => void;
  onClose: () => void;
}

const DAY_LABELS = ['1', '2', '3', '4', '5', '6', '7'];

type DayState = 'claimed' | 'missed' | 'today' | 'todayClaimed' | 'upcoming';

export default function DailyRewardModal({
  visible, currentDay, claimedToday, gemDay, gemAmount, missedDays, timeLeft, onClaim, onClose,
}: Props) {
  const { t, isEnglish } = useLanguage();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(shineAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
      shineAnim.setValue(0);
    }
  }, [visible]);

  // Determine what state each day is in
  const todayIndex = claimedToday ? currentDay - 1 : currentDay;
  const getDayState = (i: number): DayState => {
    if (missedDays.includes(i)) return 'missed';
    if (claimedToday && i === todayIndex) return 'todayClaimed';
    if (!claimedToday && i === todayIndex && currentDay < 7) return 'today';
    if (i < currentDay) return 'claimed';
    return 'upcoming';
  };

  const canClaim = !claimedToday && currentDay < 7;
  const cycleDone = currentDay >= 7;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerEmoji}>🎁</Text>
            <Text style={styles.title}>{t('مكافآت الأسبوع', 'Weekly Rewards')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {claimedToday
              ? t('رائع! عد غداً لمكافأة جديدة', 'Nice! Come back tomorrow for more')
              : t('سجّل دخولك كل يوم واحصل على جوائز', 'Log in daily to earn rewards')}
          </Text>

          {/* 7-day grid: first 4 on top row, last 3 on bottom */}
          <View style={styles.grid}>
            {DAILY_REWARDS.slice(0, 4).map((_, i) => renderDay(i, DAY_SIZE_TOP))}
          </View>
          <View style={[styles.grid, styles.gridBottom]}>
            {DAILY_REWARDS.slice(4).map((_, idx) => renderDay(idx + 4, DAY_SIZE_BOTTOM))}
          </View>

          {/* Status panel */}
          {renderStatusPanel()}

          {/* Action button */}
          {canClaim ? (
            <TouchableOpacity style={styles.claimBtn} activeOpacity={0.85} onPress={onClaim}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.claimShine,
                  {
                    transform: [{
                      translateX: shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, W] }),
                    }],
                  },
                ]}
              />
              <Text style={styles.claimBtnText}>{t('استلم المكافأة', 'Claim Reward')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.claimBtnDisabled}>
              <Text style={styles.claimBtnDisabledText}>
                {cycleDone
                  ? t('اكتملت الدورة! 🎉', 'Cycle complete! 🎉')
                  : t('تم الاستلام اليوم', 'Claimed for today')}
              </Text>
              {!cycleDone && timeLeft ? (
                <Text style={styles.countdown}>
                  {t(`التالي خلال ${timeLeft}`, `Next in ${timeLeft}`)}
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  function renderDay(i: number, size: number) {
    const state = getDayState(i);
    const reward = getRewardForDay(i, gemDay, gemAmount);
    const isGem = reward.type === 'gems';
    const isActive = state === 'today';
    const isClaimedState = state === 'claimed' || state === 'todayClaimed';
    const isMissed = state === 'missed';
    const isUpcoming = state === 'upcoming';

    const boxStyles: any[] = [styles.dayBox, { width: size }];
    if (isGem && !isClaimedState && !isMissed) boxStyles.push(styles.dayBoxGem);
    if (isClaimedState) boxStyles.push(styles.dayBoxClaimed);
    if (isMissed) boxStyles.push(styles.dayBoxMissed);
    if (isUpcoming) boxStyles.push(styles.dayBoxUpcoming);
    if (isActive) boxStyles.push(styles.dayBoxActive);
    if (isActive && isGem) boxStyles.push(styles.dayBoxGemActive);
    if (state === 'todayClaimed') boxStyles.push(styles.dayBoxTodayClaimed);
    if (isActive) boxStyles.push({ transform: [{ scale: bounceAnim }] });

    const emoji = isClaimedState ? '✅' : isMissed ? '✖️' : isGem ? '💎' : '🪙';

    const labelStyles: any[] = [styles.dayLabel];
    if (isActive) labelStyles.push(styles.dayLabelActive);
    if (isClaimedState) labelStyles.push(styles.dayLabelClaimed);
    if (isMissed) labelStyles.push(styles.dayLabelMissed);

    const rewardStyles: any[] = [styles.dayReward];
    if (isActive) rewardStyles.push(styles.dayRewardActive);
    if (isGem && !isClaimedState && !isMissed) rewardStyles.push(styles.dayRewardGem);
    if (isClaimedState) rewardStyles.push(styles.dayRewardClaimed);
    if (isMissed) rewardStyles.push(styles.dayRewardMissed);

    return (
      <Animated.View key={i} style={boxStyles}>
        {state === 'todayClaimed' && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>{t('اليوم', 'TODAY')}</Text></View>}
        <Text style={labelStyles}>
          {t(`يوم ${DAY_LABELS[i]}`, `Day ${DAY_LABELS[i]}`)}
        </Text>
        <Text style={[styles.dayEmoji, isMissed && styles.dayEmojiMissed]}>{emoji}</Text>
        <Text style={rewardStyles}>
          {isEnglish ? reward.amount : toArabicNumerals(reward.amount)}
        </Text>
      </Animated.View>
    );
  }

  function renderStatusPanel() {
    if (claimedToday && todayIndex >= 0) {
      const claimed = getRewardForDay(todayIndex, gemDay, gemAmount);
      const isGem = claimed.type === 'gems';
      return (
        <View style={[styles.todayRow, styles.todayRowClaimed]}>
          <Text style={styles.todayRowCheck}>✓</Text>
          <Text style={[styles.todayText, styles.todayTextClaimed]}>
            {t(
              `تم استلام ${toArabicNumerals(claimed.amount)} ${isGem ? '💎' : '🪙'}`,
              `Got ${claimed.amount} ${isGem ? '💎' : '🪙'}`
            )}
          </Text>
        </View>
      );
    }

    if (currentDay < 7) {
      const today = getRewardForDay(currentDay, gemDay, gemAmount);
      const isGem = today.type === 'gems';
      return (
        <View style={[styles.todayRow, isGem && styles.todayRowGem]}>
          <Text style={[styles.todayText, isGem && styles.todayTextGem]}>
            {t(
              `مكافأة اليوم: ${toArabicNumerals(today.amount)} ${isGem ? '💎' : '🪙'}`,
              `Today's reward: ${today.amount} ${isGem ? '💎' : '🪙'}`
            )}
          </Text>
        </View>
      );
    }

    return null;
  }
}

const GUTTER = 8;
const CARD_PAD = 20;
const TOP_COLS = 4;
const BOTTOM_COLS = 3;
const INNER = W - 48 - CARD_PAD * 2;
const DAY_SIZE_TOP = (INNER - GUTTER * (TOP_COLS - 1)) / TOP_COLS;
const DAY_SIZE_BOTTOM = (INNER - GUTTER * (BOTTOM_COLS - 1)) / BOTTOM_COLS;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: W - 48,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 28,
    padding: CARD_PAD,
    borderWidth: 1.5,
    borderColor: COLORS.PURPLE,
    alignItems: 'center',
    gap: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: -4,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GUTTER,
  },
  gridBottom: {
    marginTop: 4,
  },
  dayBox: {
    aspectRatio: 0.9,
    backgroundColor: '#1A1035',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
    overflow: 'hidden',
  },
  dayBoxClaimed: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(34,197,94,0.45)',
  },
  dayBoxMissed: {
    backgroundColor: 'rgba(70,70,85,0.35)',
    borderColor: 'rgba(120,120,140,0.35)',
    opacity: 0.55,
  },
  dayBoxUpcoming: {
    backgroundColor: '#17102F',
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.75,
  },
  dayBoxActive: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderColor: COLORS.GOLD,
    borderWidth: 2,
  },
  dayBoxTodayClaimed: {
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.22)',
  },
  dayBoxGem: {
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderColor: 'rgba(124,58,237,0.35)',
  },
  dayBoxGemActive: {
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderColor: '#A78BFA',
    borderWidth: 2,
  },
  todayBadge: {
    position: 'absolute',
    top: 4,
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  todayBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  dayLabelActive: {
    color: COLORS.GOLD,
  },
  dayLabelClaimed: {
    color: '#86EFAC',
  },
  dayLabelMissed: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  dayEmoji: {
    fontSize: 22,
  },
  dayEmojiMissed: {
    opacity: 0.6,
  },
  dayReward: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.TEXT_SECONDARY,
  },
  dayRewardActive: {
    color: COLORS.GOLD,
  },
  dayRewardClaimed: {
    color: '#86EFAC',
  },
  dayRewardMissed: {
    color: '#9CA3AF',
  },
  dayRewardGem: {
    color: '#A78BFA',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    width: '100%',
  },
  todayRowGem: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  todayRowClaimed: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  todayRowCheck: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '900',
  },
  todayText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.GOLD,
    textAlign: 'center',
  },
  todayTextGem: {
    color: '#A78BFA',
  },
  todayTextClaimed: {
    color: '#86EFAC',
  },
  claimBtn: {
    backgroundColor: COLORS.GREEN,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  claimShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ skewX: '-20deg' }],
  },
  claimBtnText: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: '900',
  },
  claimBtnDisabled: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 2,
  },
  claimBtnDisabledText: {
    color: '#86EFAC',
    fontSize: 15,
    fontWeight: '800',
  },
  countdown: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
});

